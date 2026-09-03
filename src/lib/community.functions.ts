import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FeedPost } from "@/data/traceverse";

export interface CommunityRoom {
  id: string;
  members: number;
  posts: FeedPost[];
}

/** Public room read: live member count + the community's discussion posts. */
export const getCommunityRoom = createServerFn({ method: "GET" })
  .inputValidator((input: { communityId: string }) => {
    if (!input?.communityId) throw new Error("Missing community");
    return input;
  })
  .handler(async ({ data }): Promise<CommunityRoom> => {
    const { publicClient, mapPost } = await import("./catalogue.server");
    const supabase = publicClient();

    const [postsRes, membersRes] = await Promise.all([
      supabase
        .from("posts")
        .select("*")
        .eq("community_id", data.communityId)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("community_members")
        .select("user_id", { count: "exact", head: true })
        .eq("community_id", data.communityId),
    ]);

    return {
      id: data.communityId,
      members: membersRes.count ?? 0,
      posts: (postsRes.data ?? []).map(mapPost),
    };
  });

/** Whether the signed-in reader is a member of a community. */
export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { communityId: string }) => input)
  .handler(async ({ data, context }): Promise<{ member: boolean }> => {
    const { data: row } = await context.supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", data.communityId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { member: Boolean(row) };
  });

/** Join or leave a community. */
export const setMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { communityId: string; join: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ member: boolean }> => {
    const { supabase, userId } = context;
    if (data.join) {
      const { error } = await supabase
        .from("community_members")
        .upsert(
          { community_id: data.communityId, user_id: userId, role: "member" },
          { onConflict: "community_id,user_id" },
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", data.communityId)
        .eq("user_id", userId);
      if (error) throw error;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("community_members")
      .select("user_id", { count: "exact", head: true })
      .eq("community_id", data.communityId);
    await supabaseAdmin
      .from("communities")
      .update({ members: count ?? 0 })
      .eq("id", data.communityId);

    return { member: data.join };
  });

/** Post a discussion (or quote) inside a community. */
export const createCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { communityId: string; body: string; spoiler?: boolean }) => {
    if (!input?.body?.trim()) throw new Error("Write something first");
    return { ...input, body: input.body.trim().slice(0, 4000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, handle, hue")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      community_id: data.communityId,
      kind: "discussion",
      body: data.body,
      spoiler: Boolean(data.spoiler),
      author_name: profile?.display_name ?? "Reader",
      handle: profile?.handle ?? "reader",
      hue: profile?.hue ?? 280,
    });
    if (error) throw error;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", data.communityId)
      .eq("hidden", false);
    await supabaseAdmin
      .from("communities")
      .update({ posts: count ?? 0 })
      .eq("id", data.communityId);

    return { ok: true };
  });

/** Create a reader-owned community. */
export const createCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description: string }) => {
    if (!input?.name?.trim()) throw new Error("Name is required");
    return {
      name: input.name.trim().slice(0, 80),
      description: (input.description ?? "").trim().slice(0, 400),
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const id = `c-${crypto.randomUUID().slice(0, 12)}`;
    const { error } = await supabase.from("communities").insert({
      id,
      name: data.name,
      description: data.description,
      owner_id: userId,
      official: false,
      hue: 280 + Math.floor(Math.random() * 60),
      members: 1,
      posts: 0,
    });
    if (error) throw error;
    await supabase
      .from("community_members")
      .insert({ community_id: id, user_id: userId, role: "owner" });
    return { id };
  });

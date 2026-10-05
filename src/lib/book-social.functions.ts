import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const validateBook = (input: { bookId: string }) => {
  if (!input?.bookId?.trim()) throw new Error("Missing book");
  return { bookId: input.bookId.trim() };
};

/** Return the signed-in reader's relationship with a book. */
export const getBookSocialState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateBook)
  .handler(async ({ data, context }): Promise<{ following: boolean }> => {
    const { data: follow, error } = await context.supabase
      .from("follows")
      .select("target_id")
      .eq("user_id", context.userId)
      .eq("target_type", "book")
      .eq("target_id", data.bookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { following: Boolean(follow) };
  });

/** Follow or unfollow one book, then refresh its real follower count. */
export const setBookFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; follow: boolean }) => ({
    ...validateBook(input),
    follow: Boolean(input.follow),
  }))
  .handler(async ({ data, context }): Promise<{ following: boolean; followers: number }> => {
    const { supabase, userId } = context;
    const mutation = data.follow
      ? supabase.from("follows").upsert(
          { user_id: userId, target_type: "book", target_id: data.bookId },
          { onConflict: "user_id,target_type,target_id" },
        )
      : supabase
          .from("follows")
          .delete()
          .eq("user_id", userId)
          .eq("target_type", "book")
          .eq("target_id", data.bookId);
    const { error } = await mutation;
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("follows")
      .select("target_id", { count: "exact", head: true })
      .eq("target_type", "book")
      .eq("target_id", data.bookId);
    const followers = count ?? 0;
    await supabaseAdmin.from("books").update({ followers }).eq("id", data.bookId);

    return { following: data.follow, followers };
  });
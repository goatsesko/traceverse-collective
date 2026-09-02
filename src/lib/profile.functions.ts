import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DashboardPayload {
  profile: {
    id: string;
    handle: string | null;
    displayName: string | null;
    bio: string | null;
    country: string | null;
    streakDays: number;
    minutesRead: number;
  };
  stats: {
    booksRead: number;
    inProgress: number;
    bookmarks: number;
    following: number;
    badges: number;
    hoursRead: number;
  };
  continueReading: { bookId: string; progress: number; chapterIdx: number }[];
  badges: { id: string; label: string; description: string | null; earnedAt: string }[];
}

/** Signed-in reader dashboard: profile, aggregate stats, continue-reading and badges. */
export const getMyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardPayload> => {
    const { supabase, userId } = context;

    const [profileRes, progressRes, bookmarksRes, followsRes, badgesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("reading_progress").select("*").eq("user_id", userId),
      supabase.from("bookmarks").select("book_id").eq("user_id", userId),
      supabase.from("follows").select("target_id").eq("user_id", userId),
      supabase.from("user_badges").select("badge_id, earned_at, badges(id,label,description)").eq("user_id", userId),
    ]);

    const p = profileRes.data;
    const progress = progressRes.data ?? [];
    const minutes = p?.minutes_read ?? progress.reduce((s, r) => s + (r.minutes ?? 0), 0);

    return {
      profile: {
        id: userId,
        handle: p?.handle ?? null,
        displayName: p?.display_name ?? null,
        bio: p?.bio ?? null,
        country: p?.country ?? null,
        streakDays: p?.streak_days ?? 0,
        minutesRead: minutes,
      },
      stats: {
        booksRead: progress.filter((r) => (r.progress ?? 0) >= 0.98).length,
        inProgress: progress.filter((r) => (r.progress ?? 0) > 0 && (r.progress ?? 0) < 0.98).length,
        bookmarks: bookmarksRes.data?.length ?? 0,
        following: followsRes.data?.length ?? 0,
        badges: badgesRes.data?.length ?? 0,
        hoursRead: Math.round(minutes / 60),
      },
      continueReading: progress
        .filter((r) => (r.progress ?? 0) < 0.98)
        .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
        .slice(0, 6)
        .map((r) => ({
          bookId: r.book_id,
          progress: r.progress ?? 0,
          chapterIdx: r.chapter_idx ?? 0,
        })),
      badges: (badgesRes.data ?? []).map((row) => {
        const b = row.badges as unknown as { id: string; label: string; description: string | null };
        return {
          id: b?.id ?? row.badge_id,
          label: b?.label ?? row.badge_id,
          description: b?.description ?? null,
          earnedAt: row.earned_at as string,
        };
      }),
    };
  });

/** Update the signed-in reader's own profile fields. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        displayName: z.string().min(1).max(60).optional(),
        handle: z
          .string()
          .min(3)
          .max(24)
          .regex(/^[a-z0-9_]+$/i)
          .optional(),
        bio: z.string().max(280).optional(),
        country: z.string().max(60).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch: Record<string, string> = {};
    if (data.displayName !== undefined) patch['display_name'] = data.displayName;
    if (data.handle !== undefined) patch['handle'] = data.handle.toLowerCase();
    if (data.bio !== undefined) patch['bio'] = data.bio;
    if (data.country !== undefined) patch['country'] = data.country;

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

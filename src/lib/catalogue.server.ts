import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { Author, Book, Chapter, Community, FeedPost } from "@/data/traceverse";

/** Publishable-key Supabase client for public catalogue reads (RLS as anon). */
export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type BookRow = Database["public"]["Tables"]["books"]["Row"];
type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

export function mapChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    index: row.idx,
    title: row.title,
    minutes: row.minutes,
    discussions: row.discussions,
    excerpt: row.excerpt,
  };
}

export function mapBook(row: BookRow, chapters: ChapterRow[] = []): Book {
  return {
    id: row.id,
    title: row.title,
    authorId: row.author_id,
    kind: row.kind,
    genre: row.genre,
    language: row.language,
    ageRating: row.age_rating,
    rating: Number(row.rating),
    readers: row.readers,
    followers: row.followers,
    year: row.year,
    hue: row.hue,
    summary: row.summary,
    tags: row.tags,
    audiobook: row.audiobook,
    ...(row.community_id ? { communityId: row.community_id } : {}),
    chapters: chapters
      .filter((c) => c.book_id === row.id)
      .sort((a, b) => a.idx - b.idx)
      .map(mapChapter),
  };
}

export function mapAuthor(row: AuthorRow, bookIds: string[]): Author {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    verified: row.verified,
    bio: row.bio,
    country: row.country ?? "",
    followers: row.followers,
    readers: row.readers,
    hue: row.hue,
    works: bookIds,
  };
}

export function mapCommunity(row: CommunityRow): Community {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    members: row.members,
    posts: row.posts,
    hue: row.hue,
    official: row.official,
    ...(row.book_id ? { bookId: row.book_id } : {}),
  };
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.round(diff / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.round(d / 7)}w`;
}

export function mapPost(row: PostRow): FeedPost {
  return {
    id: row.id,
    kind: row.kind,
    author: row.author_name,
    handle: row.handle,
    hue: row.hue,
    time: relativeTime(row.created_at),
    body: row.body,
    ...(row.book_title ? { bookTitle: row.book_title } : {}),
    likes: row.likes,
    comments: row.comments,
    ...(row.spoiler ? { spoiler: true } : {}),
  };
}

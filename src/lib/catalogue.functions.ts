import { createServerFn } from "@tanstack/react-start";

import type { Author, Book, Community, FeedPost } from "@/data/traceverse";

export interface CataloguePayload {
  books: Book[];
  authors: Author[];
  communities: Community[];
  feed: FeedPost[];
}

/** Public catalogue snapshot: published books + chapters, authors, communities, feed. */
export const getCatalogue = createServerFn({ method: "GET" }).handler(
  async (): Promise<CataloguePayload> => {
    const { publicClient, mapBook, mapAuthor, mapCommunity, mapPost } = await import(
      "./catalogue.server"
    );
    const supabase = publicClient();

    const [booksRes, chaptersRes, authorsRes, communitiesRes, postsRes] = await Promise.all([
      supabase.from("books").select("*").eq("status", "published").order("readers", { ascending: false }),
      supabase.from("chapters").select("*").order("idx", { ascending: true }),
      supabase.from("authors").select("*"),
      supabase.from("communities").select("*").order("members", { ascending: false }),
      supabase
        .from("posts")
        .select("*")
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const bookRows = booksRes.data ?? [];
    const chapterRows = chaptersRes.data ?? [];

    return {
      books: bookRows.map((b) => mapBook(b, chapterRows)),
      authors: (authorsRes.data ?? []).map((a) =>
        mapAuthor(
          a,
          bookRows.filter((b) => b.author_id === a.id).map((b) => b.id),
        ),
      ),
      communities: (communitiesRes.data ?? []).map(mapCommunity),
      feed: (postsRes.data ?? []).map(mapPost),
    };
  },
);

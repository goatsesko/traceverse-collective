import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DraftChapter {
  id: string;
  idx: number;
  title: string;
  minutes: number;
  excerpt: string;
  bodyHtml: string;
}

export interface DraftBook {
  id: string;
  title: string;
  authorName: string;
  summary: string;
  genre: string;
  language: string;
  ageRating: string;
  kind: string;
  hue: number;
  status: string;
  processingError: string | null;
  communityId: string | null;
  coverUrl: string | null;
  publisher: string | null;
  originalAuthor: string | null;
  rightsConfirmed: boolean;
  chapters: DraftChapter[];
}

/** Owner-scoped read of a book being reviewed before publishing. */
export const getDraftBook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => {
    if (!input?.bookId) throw new Error("Missing book");
    return input;
  })
  .handler(async ({ data, context }): Promise<DraftBook> => {
    const { supabase, userId } = context;
    const { data: book, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", data.bookId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!book) throw new Error("This book is not available.");

    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, idx, title, minutes, excerpt, body_html")
      .eq("book_id", book.id)
      .order("idx", { ascending: true });

    const { data: author } = await supabase
      .from("authors")
      .select("name")
      .eq("id", book.author_id)
      .maybeSingle();

    return {
      id: book.id,
      title: book.title,
      authorName: author?.name ?? "",
      summary: book.summary,
      genre: book.genre,
      language: book.language,
      ageRating: book.age_rating,
      kind: book.kind,
      hue: book.hue,
      status: book.status,
      processingError: book.processing_error,
      communityId: book.community_id,
      coverUrl: book.cover_url,
      publisher: book.publisher,
      originalAuthor: book.original_author,
      rightsConfirmed: Boolean(book.rights_confirmed),
      chapters: (chapters ?? []).map((c) => ({
        id: c.id,
        idx: c.idx,
        title: c.title,
        minutes: c.minutes,
        excerpt: c.excerpt,
        bodyHtml: c.body_html,
      })),
    };
  });

export interface DraftMetadata {
  bookId: string;
  title: string;
  authorName: string;
  summary: string;
  genre: string;
  language: string;
  ageRating: string;
  hue: number;
  publisher?: string;
  originalAuthor?: string;
  rightsConfirmed?: boolean;
}

const RATINGS = ["everyone", "teen", "young-adult", "mature"];

/** Save creator-edited metadata for a draft (also renames their author identity). */
export const updateDraftMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DraftMetadata) => {
    if (!input?.bookId) throw new Error("Missing book");
    if (!input.title?.trim()) throw new Error("A title is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: book, error } = await supabase
      .from("books")
      .update({
        title: data.title.trim(),
        summary: data.summary.trim(),
        genre: data.genre.trim() || "Fiction",
        language: data.language.trim() || "English",
        age_rating: (RATINGS.includes(data.ageRating) ? data.ageRating : "everyone") as never,
        hue: Math.max(0, Math.min(360, Math.round(data.hue))),
        publisher: (data.publisher ?? "").trim() || null,
        original_author: (data.originalAuthor ?? "").trim() || null,
        rights_confirmed: Boolean(data.rightsConfirmed),
      })
      .eq("id", data.bookId)
      .eq("owner_id", userId)
      .select("author_id")
      .maybeSingle();
    if (error) throw error;
    if (!book) throw new Error("This book is not available.");

    if (data.authorName.trim()) {
      await supabase
        .from("authors")
        .update({ name: data.authorName.trim() })
        .eq("id", book.author_id)
        .eq("user_id", userId);
    }
    return { ok: true };
  });

/** Make the reviewed book live across Home, Library, Search and its Book Page. */
export const publishBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => {
    if (!input?.bookId) throw new Error("Missing book");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("chapters")
      .select("id", { count: "exact", head: true })
      .eq("book_id", data.bookId);
    if (!count) throw new Error("This book has no chapters to publish yet.");

    const { data: current } = await supabase
      .from("books")
      .select("rights_confirmed")
      .eq("id", data.bookId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!current?.rights_confirmed) {
      throw new Error("Please confirm you hold the rights to publish this work.");
    }

    const { data: book, error } = await supabase
      .from("books")
      .update({ status: "published" as never, processing_error: null })
      .eq("id", data.bookId)
      .eq("owner_id", userId)
      .select("id, title")
      .maybeSingle();
    if (error) throw error;
    if (!book) throw new Error("This book is not available.");
    return { ok: true, bookId: book.id };
  });

/** Create the book's community with the uploading author as owner/moderator. */
export const createBookCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => {
    if (!input?.bookId) throw new Error("Missing book");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ communityId: string }> => {
    const { supabase, userId } = context;
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("id, title, hue, community_id, summary")
      .eq("id", data.bookId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (bookErr) throw bookErr;
    if (!book) throw new Error("This book is not available.");
    if (book.community_id) return { communityId: book.community_id };

    const communityId = `c-${crypto.randomUUID().slice(0, 12)}`;
    const { error: cErr } = await supabase.from("communities").insert({
      id: communityId,
      name: book.title,
      description: book.summary?.slice(0, 180) || `Readers of ${book.title}.`,
      members: 1,
      posts: 0,
      hue: book.hue,
      official: false,
      book_id: book.id,
      owner_id: userId,
    });
    if (cErr) throw cErr;

    await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: userId, role: "owner" });
    await supabase.from("books").update({ community_id: communityId }).eq("id", book.id);

    return { communityId };
  });

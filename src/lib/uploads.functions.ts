import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProcessUploadInput {
  path: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  title: string;
  kind: string;
}

export interface ProcessUploadResult {
  bookId: string;
  chapters: number;
  status: "published" | "processing";
  message: string;
}

const TEXTUAL = /\.(txt|md|markdown|html?|htm)$/i;

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Split raw text into TraceVerse chapters (headings first, then size buckets). */
function toChapters(raw: string): { title: string; paragraphs: string[] }[] {
  const text = raw.replace(/\r/g, "").trim();
  const headingSplit = text.split(/\n(?=\s*(?:chapter|CHAPTER|Chapter)\s+[\dIVXLC]+\b.*)/);
  const parts =
    headingSplit.length > 1
      ? headingSplit
      : (() => {
          const paras = text.split(/\n{2,}/).filter((p) => p.trim());
          const perChapter = Math.max(6, Math.ceil(paras.length / 12));
          const out: string[] = [];
          for (let i = 0; i < paras.length; i += perChapter) {
            out.push(paras.slice(i, i + perChapter).join("\n\n"));
          }
          return out.length ? out : [text];
        })();

  return parts.map((part, i) => {
    const paragraphs = part
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);
    const first = paragraphs[0] ?? "";
    const looksLikeHeading = /^(chapter|part|prologue|epilogue)/i.test(first) && first.length < 90;
    const title = looksLikeHeading ? first : `Chapter ${i + 1}`;
    if (looksLikeHeading) paragraphs.shift();
    return { title, paragraphs: paragraphs.length ? paragraphs : [first] };
  });
}

/**
 * Turns a stored original upload into a native TraceVerse edition:
 * structured blocks JSON + responsive HTML chapters.
 */
export const processUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProcessUploadInput) => {
    if (!input?.path) throw new Error("Missing upload path");
    if (!input.title?.trim()) throw new Error("Missing title");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProcessUploadResult> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.path.startsWith(`${userId}/`)) throw new Error("Forbidden");

    const { data: uploadRow, error: uploadErr } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        path: data.path,
        filename: data.filename,
        mime: data.mime || "application/octet-stream",
        size_bytes: data.sizeBytes,
        status: "processing",
      })
      .select("id")
      .single();
    if (uploadErr) throw uploadErr;

    // Ensure the creator has an author identity.
    const { data: profile } = await supabase
      .from("profiles")
      .select("author_id, display_name, handle, hue, bio, country")
      .eq("id", userId)
      .maybeSingle();

    let authorId = profile?.author_id ?? null;
    if (!authorId) {
      authorId = `a-${userId.slice(0, 8)}`;
      await supabaseAdmin.from("authors").upsert(
        {
          id: authorId,
          user_id: userId,
          name: profile?.display_name ?? "New author",
          handle: profile?.handle ?? `u${userId.slice(0, 8)}`,
          verified: false,
          bio: profile?.bio ?? "",
          country: profile?.country ?? null,
          hue: profile?.hue ?? 280,
        },
        { onConflict: "id" },
      );
      await supabaseAdmin.from("profiles").update({ author_id: authorId }).eq("id", userId);
    }

    const bookId = `b-${crypto.randomUUID().slice(0, 12)}`;
    const isTextual = TEXTUAL.test(data.filename);

    const { error: bookErr } = await supabaseAdmin.from("books").insert({
      id: bookId,
      owner_id: userId,
      title: data.title.trim(),
      author_id: authorId,
      kind: (["book", "story", "comic", "poem", "article", "essay", "confession", "series"].includes(
        data.kind,
      )
        ? data.kind
        : "book") as never,
      genre: "Fiction",
      language: "English",
      age_rating: "everyone" as never,
      rating: 0,
      readers: 0,
      followers: 0,
      year: new Date().getFullYear(),
      hue: profile?.hue ?? 280,
      summary: "",
      tags: [],
      audiobook: false,
      status: isTextual ? "processing" : "draft",
      source_path: data.path,
      source_kind: data.filename.split(".").pop()?.toLowerCase() ?? "bin",
    });
    if (bookErr) throw bookErr;

    if (!isTextual) {
      const message =
        "Original stored securely. PDF, EPUB and DOCX conversion is queued — you'll be notified when the native edition is ready.";
      await supabaseAdmin
        .from("books")
        .update({ processing_error: null, status: "draft" })
        .eq("id", bookId);
      await supabaseAdmin
        .from("uploads")
        .update({ status: "queued", book_id: bookId })
        .eq("id", uploadRow.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        kind: "upload",
        title: "Upload received",
        body: `${data.filename} is queued for conversion.`,
        link: `/book/${bookId}`,
      });
      return { bookId, chapters: 0, status: "processing", message };
    }

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("book-uploads")
      .download(data.path);
    if (dlErr || !file) throw dlErr ?? new Error("Could not read the uploaded file");

    const rawText = await file.text();
    const text = /\.html?$/i.test(data.filename) ? stripHtml(rawText) : rawText;
    const chapters = toChapters(text).slice(0, 60);

    const rows = chapters.map((c, i) => {
      const words = c.paragraphs.join(" ").split(/\s+/).length;
      return {
        book_id: bookId,
        idx: i + 1,
        title: c.title,
        minutes: Math.max(1, Math.round(words / 220)),
        discussions: 0,
        excerpt: (c.paragraphs[0] ?? "").slice(0, 240),
        body_html: c.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n"),
        blocks: c.paragraphs.map((p) => ({ type: "paragraph", text: p })),
      };
    });

    if (rows.length) {
      const { error: chErr } = await supabaseAdmin.from("chapters").insert(rows);
      if (chErr) throw chErr;
    }

    await supabaseAdmin
      .from("books")
      .update({
        status: "published",
        summary: (chapters[0]?.paragraphs[0] ?? "").slice(0, 400),
      })
      .eq("id", bookId);
    await supabaseAdmin
      .from("uploads")
      .update({ status: "complete", book_id: bookId })
      .eq("id", uploadRow.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      kind: "upload",
      title: "Your book is live",
      body: `${data.title} was converted into ${rows.length} chapters.`,
      link: `/book/${bookId}`,
    });

    return {
      bookId,
      chapters: rows.length,
      status: "published",
      message: `Converted into ${rows.length} responsive chapters.`,
    };
  });

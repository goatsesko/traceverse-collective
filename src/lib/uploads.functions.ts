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
  status: "ready" | "failed";
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
    const headingRe = /^((?:chapter|part|prologue|epilogue)\b[^.?!]{0,60}?)(?:[.:—-]\s+|\s{2,}|\s(?=[A-Z]))/i;
    const short = /^(chapter|part|prologue|epilogue)/i.test(first) && first.length < 90;
    let title = `Chapter ${i + 1}`;
    if (short) {
      title = first;
      paragraphs.shift();
    } else {
      const m = headingRe.exec(first);
      if (m?.[1]) {
        title = m[1].trim();
        paragraphs[0] = first.slice(m[0].length).trim();
      }
    }
    const body = paragraphs.filter(Boolean);
    return { title, paragraphs: body.length ? body : [first] };
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

    const { detectKind, extractUploadText } = await import("./extract.server");
    const bookId = `b-${crypto.randomUUID().slice(0, 12)}`;
    const kindOfFile = detectKind(data.filename, data.mime);
    const isTextual = kindOfFile !== "unsupported";

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

    const fail = async (message: string) => {
      await supabaseAdmin
        .from("books")
        .update({ processing_error: message, status: "draft" })
        .eq("id", bookId);
      await supabaseAdmin
        .from("uploads")
        .update({ status: "failed", book_id: bookId })
        .eq("id", uploadRow.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        kind: "upload",
        title: "Upload needs attention",
        body: `${data.filename}: ${message}`,
        link: `/book/${bookId}`,
      });
    };

    if (!isTextual) {
      const message = "Unsupported file type. Use PDF, EPUB, DOCX, TXT, Markdown or HTML.";
      await fail(message);
      return { bookId, chapters: 0, status: "failed", message };
    }

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("book-uploads")
      .download(data.path);
    if (dlErr || !file) throw dlErr ?? new Error("Could not read the uploaded file");

    let text = "";
    try {
      const extracted = await extractUploadText(
        await file.arrayBuffer(),
        data.filename,
        data.mime,
      );
      text = extracted.text;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We could not read text from this file.";
      await fail(message);
      return { bookId, chapters: 0, status: "failed", message };
    }

    if (text.replace(/\s/g, "").length < 200) {
      const message =
        "No readable text found — this file may be a scanned image. Try a text-based PDF or DOCX.";
      await fail(message);
      return { bookId, chapters: 0, status: "failed", message };
    }

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
        status: "draft",
        processing_error: null,
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
      title: "Your book is ready to review",
      body: `${data.title} was converted into ${rows.length} chapters.`,
      link: `/publish/${bookId}`,
    });

    return {
      bookId,
      chapters: rows.length,
      status: "ready",
      message: `Converted into ${rows.length} responsive chapters.`,
    };
  });

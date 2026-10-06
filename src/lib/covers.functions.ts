import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COVER_BUCKET = "book-covers";

function coverUrlFor(bookId: string) {
  return `/api/public/cover/${bookId}?v=${Date.now()}`;
}

async function assertOwner(
  supabase: { from: (t: "books") => any },
  bookId: string,
  userId: string,
) {
  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, summary, genre, kind, owner_id")
    .eq("id", bookId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!book) throw new Error("This book is not available.");
  return book as { id: string; title: string; summary: string; genre: string; kind: string };
}

/** Use an image the creator uploaded (to their private uploads folder) as the cover. */
export const setCoverFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; path: string; mime: string }) => {
    if (!input?.bookId || !input.path) throw new Error("Missing cover");
    if (!/^image\/(png|jpe?g|webp)$/.test(input.mime)) throw new Error("Use a PNG, JPG or WEBP image.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Forbidden");
    await assertOwner(supabase, data.bookId, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: file, error } = await supabaseAdmin.storage.from("book-uploads").download(data.path);
    if (error || !file) throw new Error("We could not read that image.");
    const { error: upErr } = await supabaseAdmin.storage
      .from(COVER_BUCKET)
      .upload(`${data.bookId}/cover`, await file.arrayBuffer(), {
        contentType: data.mime,
        upsert: true,
      });
    if (upErr) throw upErr;
    await supabaseAdmin.storage.from("book-uploads").remove([data.path]);

    const coverUrl = coverUrlFor(data.bookId);
    await supabaseAdmin.from("books").update({ cover_url: coverUrl }).eq("id", data.bookId);
    return { coverUrl };
  });

/** Remove a custom cover and fall back to the colour cover. */
export const clearCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, data.bookId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(COVER_BUCKET).remove([`${data.bookId}/cover`]);
    await supabaseAdmin.from("books").update({ cover_url: null }).eq("id", data.bookId);
    return { ok: true };
  });

/** Trace AI designs a cover from the book's title, genre and description. */
export const generateCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; style?: string }) => {
    if (!input?.bookId) throw new Error("Missing book");
    return { ...input, style: input.style?.slice(0, 300) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const book = await assertOwner(supabase, data.bookId, userId);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Trace AI is not configured yet.");

    const model = "openai/gpt-image-2.5-sunburst";
    const prompt = [
      `Design an original, striking book cover illustration for a ${book.genre || "fiction"} ${book.kind || "book"} titled "${book.title}".`,
      book.summary ? `Story essence: ${book.summary.slice(0, 500)}` : "",
      data.style ? `Style direction from the author: ${data.style}` : "",
      "Portrait composition, cinematic lighting, rich atmosphere, literary and premium.",
      "Do NOT include any text, letters, title or author name in the image — leave calm space near the bottom for a title overlay.",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size: "1024x1536", quality: "medium", stream: true, partial_images: 1 }),
    });
    if (res.status === 402 || res.status === 403) {
      throw new Error("Trace AI cover credits are used up for now. Upload your own cover instead.");
    }
    if (res.status === 429) throw new Error("Trace AI is busy. Please try again in a minute.");
    if (!res.ok || !res.body) throw new Error("Trace AI could not create a cover right now.");

    // Read the image stream to the end and keep the final frame.
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let finalB64: string | null = null;
    let lastB64: string | null = null;
    let streamError: string | null = null;
    const handleBlock = (block: string) => {
      let event = "";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      try {
        const payload = JSON.parse(dataLines.join("\n")) as {
          type?: string;
          b64_json?: string;
          error?: { message?: string };
        };
        const type = event || payload.type || "";
        if (type === "error" || payload.error) streamError = payload.error?.message ?? "failed";
        if (payload.b64_json) {
          lastB64 = payload.b64_json;
          if (type.endsWith("completed")) finalB64 = payload.b64_json;
        }
      } catch {
        /* ignore keepalives */
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value.replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        handleBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (buffer.trim()) handleBlock(buffer);
    const b64 = finalB64 ?? lastB64;
    if (!b64) throw new Error(streamError ? "Trace AI could not create this cover." : "No cover was returned.");

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from(COVER_BUCKET)
      .upload(`${data.bookId}/cover`, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const coverUrl = coverUrlFor(data.bookId);
    await supabaseAdmin.from("books").update({ cover_url: coverUrl }).eq("id", data.bookId);
    await supabaseAdmin.from("ai_usage").insert({
      user_id: userId,
      task: "cover",
      model,
      context_ref: data.bookId,
      input_chars: prompt.length,
      output_chars: 0,
    });
    return { coverUrl };
  });

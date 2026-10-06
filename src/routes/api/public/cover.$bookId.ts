import { createFileRoute } from "@tanstack/react-router";

/** Serves a book's cover image from private storage. Covers are public artwork. */
export const Route = createFileRoute("/api/public/cover/$bookId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const bookId = params.bookId;
        if (!/^[\w-]{1,80}$/.test(bookId)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("book-covers")
          .download(`${bookId}/cover`);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  Headphones,
  Image as ImageIcon,
  Mic,
  PenLine,
  ScrollText,
  Sparkles,
  UploadCloud,
  VenetianMask,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { processUpload } from "@/lib/uploads.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create & Publish — TraceVerse" },
      {
        name: "description",
        content:
          "Write, upload and publish books, comics, poems, essays and confessions with the TraceVerse Import Studio.",
      },
      { property: "og:title", content: "Create & Publish — TraceVerse" },
      {
        property: "og:description",
        content: "Upload a PDF and TraceVerse turns it into a native, responsive publication.",
      },
    ],
  }),
  component: CreatePage,
});

const kinds = [
  { icon: BookOpen, label: "Book" },
  { icon: PenLine, label: "Story" },
  { icon: ImageIcon, label: "Comic" },
  { icon: ScrollText, label: "Poem" },
  { icon: FileText, label: "Article" },
  { icon: VenetianMask, label: "Confession" },
  { icon: Headphones, label: "Audiobook" },
  { icon: Mic, label: "Podcast" },
];

const pipeline = [
  ["UPLOADED", "Original file stored securely"],
  ["EXTRACTING", "Text, images and tables pulled out"],
  ["STRUCTURING", "Chapters, headings and paragraphs detected"],
  ["PREVIEW_READY", "Responsive HTML chapters + book.json generated"],
  ["AUTHOR_REVIEW", "You approve the native edition"],
  ["PUBLISHED", "Book Page goes live with its community"],
] as const;

function CreatePage() {
  const [kind, setKind] = useState("Book");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const run = useServerFn(processUpload);

  const onFile = async (file: File) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    setStatus(`UPLOADED · storing ${file.name} securely…`);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("book-uploads").upload(path, file);
      if (error) throw error;

      setStatus("EXTRACTING · building your native edition…");
      const res = await run({
        data: {
          path,
          filename: file.name,
          mime: file.type,
          sizeBytes: file.size,
          title: file.name.replace(/\.[^.]+$/, ""),
          kind: kind.toLowerCase(),
        },
      });
      setStatus(`${res.status === "published" ? "PUBLISHED" : "QUEUED"} · ${res.message}`);
      if (res.status === "published") {
        navigate({ to: "/book/$bookId", params: { bookId: res.bookId } });
      }
    } catch (err) {
      setStatus(err instanceof Error ? `Upload failed — ${err.message}` : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Create">
      <section className="px-4 pt-5">
        <h1 className="font-display text-2xl font-semibold">Your first story starts here.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what you are publishing. Everything becomes a native TraceVerse publication.
        </p>
      </section>

      <section className="mt-5 grid grid-cols-4 gap-2 px-4">
        {kinds.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => setKind(k.label)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl p-3 text-[11px] transition-colors",
              kind === k.label
                ? "trace-gradient text-primary-foreground shadow-glow"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <k.icon className="size-5" />
            {k.label}
          </button>
        ))}
      </section>

      <section className="mt-6 px-4">
        <div className="glass flex flex-col items-center gap-3 rounded-3xl border-dashed p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl trace-gradient text-primary-foreground shadow-glow">
            <UploadCloud className="size-6" />
          </span>
          <p className="font-display text-base font-semibold">Import Studio</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Drop a PDF, EPUB, DOCX, TXT, Markdown or HTML file. TraceVerse keeps the original safe
            and builds a responsive native edition your readers actually read.
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.epub,.docx,.txt,.md,.markdown,.html,.htm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onFile(f);
            }}
          />
          <Button
            className="rounded-2xl"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Working…" : "Choose a file"}
          </Button>
          {status ? <p className="text-[11px] text-primary">{status}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            You confirm you hold the rights to publish this work.
          </p>
        </div>
      </section>

      <section className="mt-7 px-4">
        <h2 className="font-display text-lg font-semibold">How your upload becomes a book</h2>
        <p className="text-xs text-muted-foreground">
          Processing runs in the background — keep browsing, we'll notify you.
        </p>
        <ol className="mt-4 space-y-2">
          {pipeline.map(([state, desc], i) => (
            <li key={state} className="glass flex items-center gap-3 rounded-2xl p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary/70 text-xs font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wider text-primary">{state}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-7 px-4">
        <div className="glass rounded-3xl p-5">
          <p className="flex items-center gap-2 font-display text-base font-semibold">
            <Sparkles className="size-4 text-primary" /> Trace AI Creator Studio
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Titles, descriptions, covers, translation, readability, age-rating suggestions — every
            suggestion stays editable. You stay in control.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Suggest a title",
              "Write my description",
              "Generate a cover",
              "Check readability",
              "Suggest age rating",
            ].map((s) => (
              <span
                key={s}
                className="rounded-2xl border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

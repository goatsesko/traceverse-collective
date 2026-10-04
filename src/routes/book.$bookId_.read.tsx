import { createFileRoute, Link, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  List,
  MessageCircle,
  Minus,
  Plus,
  Sparkles,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TraceAIPanel } from "@/components/traceverse/TraceAI";
import { Button } from "@/components/ui/button";
import { formatCount, type Book } from "@/data/traceverse";
import { catalogueQueryOptions } from "@/lib/catalogue-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$bookId_/read")({
  validateSearch: (s: Record<string, unknown>): { ch?: number } => {
    const n = Number(s["ch"]);
    return Number.isFinite(n) && n >= 1 ? { ch: Math.floor(n) } : {};
  },
  loader: async ({ context, params }) => {
    const catalogue = await context.queryClient.ensureQueryData(catalogueQueryOptions);
    const book = catalogue.books.find((b) => b.id === params.bookId);
    const author = book ? catalogue.authors.find((a) => a.id === book.authorId) : undefined;
    if (!book || !author) throw notFound();
    return { book, author };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Reader — TraceVerse" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `Reading ${loaderData.book.title} — TraceVerse` },
        {
          name: "description",
          content: `Read ${loaderData.book.title} by ${loaderData.author.name} in the TraceVerse reader.`,
        },
        { property: "og:title", content: `Reading ${loaderData.book.title} — TraceVerse` },
        {
          property: "og:description",
          content: "Distraction-free reading with chapter discussions and Trace AI.",
        },
        { property: "og:type", content: "book" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  pendingComponent: ReaderPending,
  pendingMs: 0,
  errorComponent: ReaderError,
  notFoundComponent: ReaderNotFound,
  component: ReaderPage,
});

const themes = {
  oled: "bg-background text-foreground",
  sepia: "bg-[oklch(0.93_0.03_82)] text-[oklch(0.25_0.03_60)]",
  paper: "bg-[oklch(0.97_0.005_300)] text-[oklch(0.2_0.02_300)]",
} as const;

const WORDS_PER_PAGE = 260;

interface ReaderPageData {
  chapterIdx: number; // position in book.chapters
  chapterNumber: number;
  chapterTitle: string;
  label: string; // "Chapter 3", "Preface", ...
  isChapter: boolean;
  first: boolean; // first page of chapter
  paragraphs: string[];
}

/** Clean raw extracted text into readable paragraphs. */
function cleanParagraphs(raw: string[], chapterTitle: string): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const t = r
      .replace(/\s+/g, " ")
      .replace(/(\w)-\s+(\w)/g, "$1$2")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
    if (!t) continue;
    if (out.length === 0 && t.toLowerCase() === chapterTitle.trim().toLowerCase()) continue;
    out.push(t);
  }
  return out;
}

/** Split a long paragraph at sentence boundaries so pages stay balanced. */
function splitLong(p: string): string[] {
  const words = p.split(" ");
  if (words.length <= WORDS_PER_PAGE) return [p];
  const sentences = p.match(/[^.!?]+[.!?]+["')\]]*\s*|.+$/g) ?? [p];
  const parts: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).split(" ").length > WORDS_PER_PAGE && cur) {
      parts.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const SECTION_LABELS: Record<string, string> = {
  front: "Front Matter", dedication: "Dedication", epigraph: "Epigraph", preface: "Preface",
  introduction: "Introduction", prologue: "Prologue", part: "Part", epilogue: "Epilogue",
  afterword: "Afterword", endnotes: "Ending Matter",
};

/** Display labels following the book's real structure. */
function sectionLabels(book: Book): string[] {
  let n = 0;
  return book.chapters.map((c) =>
    !c.section || c.section === "chapter" ? `Chapter ${++n}` : (SECTION_LABELS[c.section] ?? "Section"),
  );
}

function paginate(book: Book): ReaderPageData[] {
  const pages: ReaderPageData[] = [];
  const labels = sectionLabels(book);
  book.chapters.forEach((c, chapterIdx) => {
    const source = c.paragraphs?.length ? c.paragraphs : c.excerpt ? [c.excerpt] : [];
    const paras = cleanParagraphs(source, c.title).flatMap(splitLong);
    let bucket: string[] = [];
    let count = 0;
    let first = true;
    const flush = () => {
      pages.push({
        chapterIdx,
        chapterNumber: c.index,
        chapterTitle: c.title,
        label: labels[chapterIdx] ?? "",
        isChapter: !c.section || c.section === "chapter",
        first,
        paragraphs: bucket,
      });
      first = false;
      bucket = [];
      count = 0;
    };
    for (const p of paras) {
      const w = p.split(" ").length;
      if (count > 0 && count + w > WORDS_PER_PAGE) flush();
      bucket.push(p);
      count += w;
    }
    if (bucket.length || first) flush();
  });
  if (pages.length === 0 && book.summary) {
    pages.push({
      chapterIdx: 0,
      chapterNumber: 1,
      chapterTitle: book.title,
      label: "Chapter 1",
      isChapter: true,
      first: true,
      paragraphs: cleanParagraphs([book.summary], book.title),
    });
  }
  return pages;
}

function ReaderPending() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 px-6 pt-24">
        <div className="mx-auto h-3 w-24 rounded bg-secondary/60" />
        <div className="mx-auto h-7 w-2/3 rounded bg-secondary/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-secondary/40" />
        ))}
        <p className="pt-6 text-center text-xs opacity-50">Opening your book…</p>
      </div>
    </div>
  );
}

function ReaderError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <p className="font-display text-xl font-semibold">We couldn't open this book</p>
        <p className="mt-2 text-sm opacity-60">{(error as Error)?.message || "Something went wrong."}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button className="rounded-2xl" onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" className="rounded-2xl" asChild>
            <Link to="/library">Library</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReaderNotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <p className="font-display text-xl font-semibold">This book isn't available</p>
        <p className="mt-2 text-sm opacity-60">It may be unpublished or removed.</p>
        <Button variant="secondary" className="mt-6 rounded-2xl" asChild>
          <Link to="/library">Back to Library</Link>
        </Button>
      </div>
    </div>
  );
}

function ReaderPage() {
  const { book, author } = Route.useLoaderData();
  const { ch } = Route.useSearch();
  const pages = useMemo(() => paginate(book), [book]);
  const tocLabels = useMemo(() => sectionLabels(book), [book]);

  const startPage = useMemo(() => {
    // No ch → Chapter 1, Page 1 (first chapter with idx 1, else first chapter page).
    let i = ch ? pages.findIndex((p) => p.chapterNumber === ch) : -1;
    if (i < 0) i = pages.findIndex((p) => p.chapterNumber === 1 && p.first);
    if (i < 0) i = pages.findIndex((p) => p.isChapter);
    return i < 0 ? 0 : i;
  }, [ch, pages]);

  const [page, setPage] = useState(startPage);
  const [fontSize, setFontSize] = useState(19);
  const [theme, setTheme] = useState<keyof typeof themes>("oled");
  const [controls, setControls] = useState(true);
  const [toc, setToc] = useState(false);

  useEffect(() => setPage(startPage), [book.id, startPage]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page, book.id]);

  const total = Math.max(1, pages.length);
  const current = pages[page];
  const chapter = current ? book.chapters[current.chapterIdx] : undefined;
  const go = (n: number) => setPage(Math.max(0, Math.min(total - 1, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(total - 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  return (
    <div className={cn("min-h-screen transition-colors duration-500", themes[theme])}>
      {/* Top bar */}
      <div
        className={cn(
          "sticky top-0 z-20 glass transition-all duration-300",
          controls ? "opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/book/$bookId"
            params={{ bookId: book.id }}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/60"
            aria-label="Back to book page"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">{book.title}</p>
            <p className="truncate text-[11px] opacity-60">by {author.name}</p>
          </div>
          <button
            type="button"
            aria-label="Chapters"
            onClick={() => setToc((t) => !t)}
            className="grid size-9 place-items-center rounded-xl bg-secondary/60"
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Decrease text size"
            onClick={() => setFontSize((f) => Math.max(15, f - 1))}
            className="grid size-9 place-items-center rounded-xl bg-secondary/60"
          >
            <Minus className="size-4" />
          </button>
          <Type className="hidden size-4 opacity-60 sm:block" />
          <button
            type="button"
            aria-label="Increase text size"
            onClick={() => setFontSize((f) => Math.min(26, f + 1))}
            className="grid size-9 place-items-center rounded-xl bg-secondary/60"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pb-3">
          {(Object.keys(themes) as (keyof typeof themes)[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[11px] capitalize",
                theme === t ? "trace-gradient text-primary-foreground" : "bg-secondary/60",
              )}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-[11px] tabular-nums opacity-60">
            Page {page + 1} of {total}
          </span>
        </div>
        <div className="h-0.5 w-full bg-secondary/40">
          <div
            className="h-full trace-gradient transition-all duration-500"
            style={{ width: `${((page + 1) / total) * 100}%` }}
          />
        </div>

        {toc ? (
          <div className="mx-auto max-h-[50vh] max-w-2xl overflow-y-auto px-4 pb-4">
            {book.chapters.map((c, i) => {
              const target = pages.findIndex((p) => p.chapterIdx === i);
              const active = current?.chapterIdx === i;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={target < 0}
                  onClick={() => {
                    go(target);
                    setToc(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                    active ? "bg-secondary/70 font-semibold" : "hover:bg-secondary/40",
                  )}
                >
                  <span className="w-24 shrink-0 text-xs opacity-50">{tocLabels[i]}</span>
                  <span className="truncate">{c.title}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Page */}
      <article
        className="mx-auto max-w-2xl px-6 pb-40 pt-10 sm:px-10"
        onClick={() => setControls((c) => !c)}
        style={{ fontFamily: "var(--font-reading)" }}
      >
        {current ? (
          <>
            {current.first ? (
              <header className="mb-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.3em] opacity-50">
                  {current.label}
                </p>
                <h1 className="mt-3 font-display text-3xl leading-tight font-semibold">
                  {current.chapterTitle}
                </h1>
                <div className="mx-auto mt-5 h-px w-12 trace-gradient" />
              </header>
            ) : (
              <p className="mb-6 text-center text-[11px] uppercase tracking-[0.24em] opacity-40">
                {current.chapterTitle}
              </p>
            )}
            <div
              className="text-pretty"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            >
              {current.paragraphs.length === 0 ? (
                <p className="py-16 text-center text-sm opacity-60">
                  This section has no readable text yet. Use Next or the chapter list to continue.
                </p>
              ) : null}
              {current.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={cn(
                    "mb-5",
                    current.first && i === 0
                      ? "first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[3.2em] first-letter:leading-[0.9] first-letter:text-primary"
                      : i > 0 && "indent-6",
                  )}
                >
                  {p}
                </p>
              ))}
            </div>
            <p className="mt-10 text-center text-xs tabular-nums opacity-40">— {page + 1} —</p>
          </>
        ) : (
          <p className="py-24 text-center text-sm opacity-60">
            This book doesn't have readable content yet.
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="rounded-2xl"
            disabled={page === 0}
            onClick={(e) => {
              e.stopPropagation();
              go(page - 1);
            }}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button
            className="rounded-2xl"
            disabled={page >= total - 1}
            onClick={(e) => {
              e.stopPropagation();
              go(page + 1);
            }}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </article>

      {/* Bottom actions */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 transition-all duration-300",
          controls ? "opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <div className="glass flex w-full max-w-md items-center gap-2 rounded-3xl p-2 shadow-float">
          <Button variant="ghost" className="flex-1 rounded-2xl text-xs">
            <MessageCircle className="size-4" />
            {chapter
              ? `${formatCount(chapter.discussions)} discussing Ch. ${chapter.index}`
              : "Discussions"}
          </Button>
          <TraceAIPanel
            context={`${book.title}${current ? ` · ${current.label}` : ""}`}
            suggestions={[
              "Summarise this chapter",
              "What happened before this?",
              "Explain this like I'm 12",
              "Quiz me on this chapter",
            ]}
            trigger={
              <Button size="icon" className="rounded-2xl" aria-label="Ask Trace AI">
                <Sparkles className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

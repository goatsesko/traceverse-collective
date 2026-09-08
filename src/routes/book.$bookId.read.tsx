import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  Sparkles,
  Type,
} from "lucide-react";
import { useState } from "react";

import { TraceAIPanel } from "@/components/traceverse/TraceAI";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/data/traceverse";
import { catalogueQueryOptions } from "@/lib/catalogue-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$bookId/read")({
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
          content: `Read ${loaderData.book.title} by ${loaderData.author.name} in the TraceVerse adaptive reader.`,
        },
        { property: "og:title", content: `Reading ${loaderData.book.title} — TraceVerse` },
        {
          property: "og:description",
          content: "Adaptive typography, chapter discussions and Trace AI inside the reader.",
        },
      ],
    };
  },
  component: ReaderPage,
});

const themes = {
  oled: "bg-background text-foreground",
  sepia: "bg-[oklch(0.93_0.03_82)] text-[oklch(0.25_0.03_60)]",
  paper: "bg-[oklch(0.97_0.005_300)] text-[oklch(0.2_0.02_300)]",
} as const;

function ReaderPage() {
  const { book } = Route.useLoaderData();
  const [index, setIndex] = useState(0);
  const [fontSize, setFontSize] = useState(19);
  const [theme, setTheme] = useState<keyof typeof themes>("oled");
  const [controls, setControls] = useState(true);

  const chapter = book.chapters[index]!;

  /** Dynamic reading engine: layout is derived at render time, never pre-baked. */
  const paragraphs = chapter.paragraphs?.length
    ? chapter.paragraphs
    : [
        chapter.excerpt,
        "The morning came the way it always did here, without asking. Somewhere behind the compound a radio argued with itself, and the water carried the sound further than it had any right to.",
        "We had learned to measure distance in crossings rather than kilometres. Three crossings to the market. One to the school. Half a crossing to the place where the current turned and the boatman would not go.",
        "My mother said a river remembers everything it has ever carried. I did not believe her until the year it gave something back.",
        "By evening the light had gone the colour of old brass, and the children were counting boats instead of stars. There were fewer boats than last season. Nobody said why.",
      ];

  return (
    <div className={cn("min-h-screen transition-colors duration-500", themes[theme])}>
      <div
        className={cn(
          "sticky top-0 z-20 glass transition-all duration-300",
          controls ? "opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/book/$bookId"
            params={{ bookId: book.id }}
            className="grid size-9 place-items-center rounded-xl bg-secondary/60"
            aria-label="Back to book page"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{book.title}</p>
            <p className="truncate text-[11px] opacity-60">
              Chapter {chapter.index} · {chapter.minutes} min left
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease text size"
              onClick={() => setFontSize((f) => Math.max(15, f - 1))}
              className="grid size-9 place-items-center rounded-xl bg-secondary/60"
            >
              <Minus className="size-4" />
            </button>
            <Type className="size-4 opacity-60" />
            <button
              type="button"
              aria-label="Increase text size"
              onClick={() => setFontSize((f) => Math.min(26, f + 1))}
              className="grid size-9 place-items-center rounded-xl bg-secondary/60"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
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
          <div className="ml-auto h-1.5 w-24 self-center overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full trace-gradient"
              style={{ width: `${((index + 1) / book.chapters.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <article
        className="mx-auto max-w-3xl px-6 py-10"
        onClick={() => setControls((c) => !c)}
        style={{ fontFamily: "var(--font-reading)" }}
      >
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">
          Chapter {chapter.index}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{chapter.title}</h1>
        <div
          className="mt-6 space-y-5 leading-relaxed"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
        >
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="secondary"
            className="rounded-2xl"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button
            className="rounded-2xl"
            disabled={index === book.chapters.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(book.chapters.length - 1, i + 1));
            }}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </article>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-5 transition-all duration-300",
          controls ? "opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="glass flex w-full max-w-md items-center gap-2 rounded-3xl p-2 shadow-float">
          <Button variant="ghost" className="flex-1 rounded-2xl text-xs">
            <MessageCircle className="size-4" />
            {formatCount(chapter.discussions)} discussing Ch. {chapter.index}
          </Button>
          <TraceAIPanel
            context={`${book.title} · Chapter ${chapter.index}`}
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

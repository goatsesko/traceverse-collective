import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { BookCard } from "@/components/traceverse/BookCard";
import { Shell } from "@/components/traceverse/Shell";
import { Input } from "@/components/ui/input";
import { authors, books, communities, formatCount } from "@/data/traceverse";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — TraceVerse" },
      {
        name: "description",
        content:
          "Semantic search across books, authors, communities, comics and confessions, powered by Trace AI.",
      },
      { property: "og:title", content: "Search — TraceVerse" },
      {
        property: "og:description",
        content: "Ask for what you feel like reading. Trace AI understands intent, not keywords.",
      },
    ],
  }),
  component: SearchPage,
});

const examples = [
  "Books like Atomic Habits",
  "Romance stories in Kenya",
  "Books that will make me cry",
  "Funny confessions",
  "Best African mystery novels",
];

function SearchPage() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!term) return { books, authors, communities };
    const match = (s: string) => s.toLowerCase().includes(term);
    return {
      books: books.filter(
        (b) => match(b.title) || match(b.genre) || match(b.summary) || b.tags.some(match),
      ),
      authors: authors.filter((a) => match(a.name) || match(a.bio) || match(a.country)),
      communities: communities.filter((c) => match(c.name) || match(c.description)),
    };
  }, [term]);

  return (
    <Shell title="Search" showSearch={false}>
      <div className="px-4 pt-4">
        <div className="glass flex items-center gap-2 rounded-2xl px-3">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask for what you feel like reading…"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {examples.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setQ(e)}
              className="shrink-0 rounded-2xl border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {e}
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3 text-primary" /> Trace AI reads intent, tone and themes — not
          just keywords.
        </p>
      </div>

      <section className="mt-6 px-4">
        <h2 className="mb-3 font-display text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Books
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {results.books.map((b) => (
            <BookCard key={b.id} book={b} className="w-full" />
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Authors
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {results.authors.map((a) => (
            <Link
              key={a.id}
              to="/author/$authorId"
              params={{ authorId: a.id }}
              className="glass flex items-center gap-3 rounded-2xl p-3"
            >
              <span
                className="size-10 rounded-full"
                style={{
                  backgroundImage: `linear-gradient(140deg, oklch(0.6 0.2 ${a.hue}), oklch(0.28 0.1 ${a.hue + 30}))`,
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {a.name} {a.verified ? "✓" : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCount(a.followers)} followers · {a.country}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Communities
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {results.communities.map((c) => (
            <Link
              key={c.id}
              to="/community/$communityId"
              params={{ communityId: c.id }}
              className="glass rounded-2xl p-3"
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{formatCount(c.members)} members</p>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

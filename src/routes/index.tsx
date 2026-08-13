import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Sparkles, Compass, ChevronRight, MessageCircle, Heart } from "lucide-react";

import { BookCard } from "@/components/traceverse/BookCard";
import { Rail } from "@/components/traceverse/Rail";
import { Shell } from "@/components/traceverse/Shell";
import { TraceAIPanel } from "@/components/traceverse/TraceAI";
import { Button } from "@/components/ui/button";
import { books, communities, feed, formatCount } from "@/data/traceverse";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TraceVerse — Every Story Leaves a Trace" },
      {
        name: "description",
        content:
          "TraceVerse is the global social network for reading, publishing and discovering stories, powered by Trace AI.",
      },
      { property: "og:title", content: "TraceVerse — Every Story Leaves a Trace" },
      {
        property: "og:description",
        content:
          "Read, publish and discuss stories. Book pages, author pages, communities and Trace AI in one living universe.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const continueReading = books.filter((b) => typeof b.progress === "number");
  const trending = [...books].sort((a, b) => b.readers - a.readers);
  const fresh = [...books].sort((a, b) => b.year - a.year);
  const hiddenGems = books.filter((b) => b.readers < 100_000);

  return (
    <Shell>
      <section className="px-4 pt-6 pb-8 animate-rise">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Thursday · Nairobi
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-semibold">
          Good morning.
          <br />
          <span className="trace-text">Every story leaves a trace.</span>
        </h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <TraceAIPanel
            context="your reading profile"
            suggestions={[
              "Something emotional but not too long",
              "Mystery with a strong female lead",
              "African novels about identity",
            ]}
            trigger={
              <Button className="rounded-2xl shadow-glow">
                <Sparkles className="size-4" /> Ask Trace AI
              </Button>
            }
          />
          <Button variant="secondary" className="rounded-2xl" asChild>
            <Link to="/search">
              <Compass className="size-4" /> Discover
            </Link>
          </Button>
        </div>
      </section>

      <div className="space-y-9">
        <Rail title="Continue reading" subtitle="Pick up where you stopped">
          {continueReading.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </Rail>

        <Rail
          title="For you"
          subtitle="Personalised by Trace AI from your reading behaviour"
          action={
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              Refresh <ChevronRight className="size-3" />
            </span>
          }
        >
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </Rail>

        <Rail title="Trending in Kenya" subtitle="Most read in the last 24 hours">
          {trending.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </Rail>

        <section className="animate-rise">
          <div className="mb-3 flex items-end justify-between px-4">
            <div>
              <h2 className="font-display text-lg font-semibold">The feed</h2>
              <p className="text-xs text-muted-foreground">
                Excerpts, quotes, confessions and discussions
              </p>
            </div>
            <Flame className="size-4 text-accent" />
          </div>
          <div className="space-y-3 px-4">
            {feed.map((p) => (
              <article key={p.id} className="glass rounded-3xl p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-full text-xs font-semibold text-foreground"
                    style={{
                      backgroundImage: `linear-gradient(140deg, oklch(0.6 0.2 ${p.hue}), oklch(0.3 0.1 ${p.hue + 30}))`,
                    }}
                  >
                    {p.author.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.author}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.handle} · {p.time}
                      {p.bookTitle ? ` · ${p.bookTitle}` : ""}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.kind}
                  </span>
                </div>
                <p
                  className={
                    p.spoiler
                      ? "mt-3 rounded-2xl bg-secondary/40 p-3 text-sm blur-[5px] transition select-none hover:blur-none"
                      : "mt-3 text-sm leading-relaxed text-foreground/90"
                  }
                >
                  {p.body}
                </p>
                {p.spoiler ? (
                  <p className="mt-1 text-[11px] text-accent">
                    Spoiler up to Chapter 8 · tap to reveal
                  </p>
                ) : null}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="size-3.5" /> {formatCount(p.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3.5" /> {formatCount(p.comments)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Rail title="Recently published" subtitle="Fresh from the Import Studio">
          {fresh.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </Rail>

        <Rail title="Hidden gems" subtitle="New voices worth your evening">
          {hiddenGems.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </Rail>

        <section className="animate-rise px-4">
          <h2 className="mb-3 font-display text-lg font-semibold">Recommended communities</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {communities.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                to="/community/$communityId"
                params={{ communityId: c.id }}
                className="glass rounded-3xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div
                  className="mb-3 h-16 rounded-2xl"
                  style={{
                    backgroundImage: `linear-gradient(120deg, oklch(0.55 0.2 ${c.hue}), oklch(0.25 0.08 ${c.hue + 40}))`,
                  }}
                />
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatCount(c.members)} members
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

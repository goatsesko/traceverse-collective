import { createFileRoute } from "@tanstack/react-router";
import { Award, Flame, Clock, BookOpen } from "lucide-react";

import { BookCard } from "@/components/traceverse/BookCard";
import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { books } from "@/data/traceverse";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — TraceVerse" },
      {
        name: "description",
        content:
          "Reading streaks, hours read, badges, published works and saved stories on your TraceVerse profile.",
      },
      { property: "og:title", content: "Your Profile — TraceVerse" },
      {
        property: "og:description",
        content: "Track your reading life: streaks, badges, finished books and published work.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <Shell title="Profile">
      <section className="px-4 pt-6">
        <div className="flex items-center gap-4">
          <span className="size-18 rounded-3xl trace-gradient shadow-glow" />
          <div>
            <h1 className="font-display text-xl font-semibold">Reader</h1>
            <p className="text-xs text-muted-foreground">@you · Nairobi, Kenya</p>
            <p className="mt-1 text-xs text-muted-foreground">Level 7 · Deep Reader</p>
          </div>
          <Button variant="secondary" className="ml-auto rounded-2xl">
            Edit
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<Flame className="size-4" />} value="24" label="Day streak" />
          <Metric icon={<BookOpen className="size-4" />} value="38" label="Books read" />
          <Metric icon={<Clock className="size-4" />} value="212h" label="Hours read" />
          <Metric icon={<Award className="size-4" />} value="16" label="Badges" />
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Recently read</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {books.slice(0, 5).map((b) => (
            <BookCard key={b.id} book={b} className="w-full" />
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Night Reader",
            "Finished a Series",
            "First Publication",
            "Community Voice",
            "100 Hours",
            "Hidden Gem Hunter",
          ].map((b) => (
            <span
              key={b}
              className="glass rounded-2xl px-3 py-2 text-xs text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <span className="text-primary">{icon}</span>
      <p className="mt-2 font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

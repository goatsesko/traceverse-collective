import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useState } from "react";

import { BookCard } from "@/components/traceverse/BookCard";
import { EmptyState } from "@/components/traceverse/EmptyState";
import { Shell } from "@/components/traceverse/Shell";
import { genres } from "@/data/traceverse";
import { catalogueQueryOptions, useCatalogue } from "@/lib/catalogue-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — TraceVerse" },
      {
        name: "description",
        content:
          "Continue reading, saved stories, wishlist and every genre in the TraceVerse library.",
      },
      { property: "og:title", content: "Your Library — TraceVerse" },
      {
        property: "og:description",
        content: "Continue reading, saved stories, wishlist and every genre on TraceVerse.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogueQueryOptions),
  component: LibraryPage,
});

const shelves = [
  "Currently Reading",
  "Continue Reading",
  "Saved",
  "Wishlist",
  "Downloaded",
  "Finished",
] as const;

function LibraryPage() {
  const { books } = useCatalogue();
  const [shelf, setShelf] = useState<(typeof shelves)[number]>("Currently Reading");
  const [genre, setGenre] = useState<string | null>(null);

  const shelfBooks =
    shelf === "Currently Reading" || shelf === "Continue Reading"
      ? books.filter((b) => typeof b.progress === "number")
      : shelf === "Saved"
        ? books.slice(0, 4)
        : shelf === "Wishlist"
          ? books.slice(2, 5)
          : shelf === "Downloaded"
            ? books.slice(0, 2)
            : [];

  const catalogue = genre ? books.filter((b) => b.genre === genre) : books;

  return (
    <Shell title="Library">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
        {shelves.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setShelf(s)}
            className={cn(
              "shrink-0 rounded-2xl px-3.5 py-2 text-xs font-medium transition-colors",
              shelf === s
                ? "trace-gradient text-primary-foreground shadow-glow"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="px-4">
        {shelfBooks.length ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {shelfBooks.map((b) => (
              <BookCard key={b.id} book={b} className="w-full" />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            line="No story has found its way here yet."
          />
        )}
      </section>

      <section className="mt-9">
        <h2 className="px-4 font-display text-lg font-semibold">Browse categories</h2>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={cn(
              "shrink-0 rounded-2xl px-3.5 py-2 text-xs",
              genre === null ? "bg-foreground/90 text-background" : "bg-secondary/60 text-muted-foreground",
            )}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={cn(
                "shrink-0 rounded-2xl px-3.5 py-2 text-xs transition-colors",
                genre === g
                  ? "bg-foreground/90 text-background"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 px-4 sm:grid-cols-5">
          {catalogue.map((b) => (
            <BookCard key={b.id} book={b} className="w-full" />
          ))}
        </div>
        {catalogue.length === 0 ? (
          <div className="px-4 pt-4">
            <EmptyState
              icon={<BookOpen className="size-6" />}
              line="Nothing here yet — this shelf is waiting for its first story."
            />
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

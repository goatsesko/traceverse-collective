import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { BookCover } from "./BookCover";
import { authorOf, formatCount, type Book } from "@/data/traceverse";
import { cn } from "@/lib/utils";

export function BookCard({ book, className }: { book: Book; className?: string }) {
  const author = authorOf(book);
  return (
    <Link
      to="/book/$bookId"
      params={{ bookId: book.id }}
      className={cn(
        "group block w-36 shrink-0 transition-transform duration-300 ease-out hover:-translate-y-1 sm:w-40",
        className,
      )}
    >
      <div className="relative">
        <BookCover title={book.title} hue={book.hue} kind={book.kind} />
        {typeof book.progress === "number" ? (
          <div className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-background/40">
            <div
              className="h-full trace-gradient"
              style={{ width: `${Math.round(book.progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{book.title}</p>
      <p className="truncate text-xs text-muted-foreground">{author.name}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Star className="size-3 fill-current text-accent" />
        {book.rating.toFixed(1)}
        <span className="opacity-50">·</span>
        {formatCount(book.readers)} readers
      </p>
    </Link>
  );
}

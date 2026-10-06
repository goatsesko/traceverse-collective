import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Bookmark,
  Headphones,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BookCard } from "@/components/traceverse/BookCard";
import { BookCover } from "@/components/traceverse/BookCover";
import { Shell } from "@/components/traceverse/Shell";
import { TraceAIPanel } from "@/components/traceverse/TraceAI";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount } from "@/data/traceverse";
import { useAuth } from "@/hooks/useAuth";
import { getBookSocialState, setBookFollow } from "@/lib/book-social.functions";
import { catalogueQueryOptions, useCatalogue } from "@/lib/catalogue-query";

export const Route = createFileRoute("/book/$bookId")({
  loader: async ({ context, params }) => {
    const catalogue = await context.queryClient.ensureQueryData(catalogueQueryOptions);
    const book = catalogue.books.find((b) => b.id === params.bookId);
    const author = book ? catalogue.authors.find((a) => a.id === book.authorId) : undefined;
    if (!book || !author) throw notFound();
    return { book, author };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Book unavailable — TraceVerse" }, { name: "robots", content: "noindex" }],
      };
    }
    const { book, author } = loaderData;
    const title = `${book.title} by ${author.name} — TraceVerse`;
    return {
      meta: [
        { title },
        { name: "description", content: book.summary.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: book.summary.slice(0, 155) },
        { property: "og:type", content: "book" },
      ],
    };
  },
  component: BookPage,
});

function BookPage() {
  const { book, author } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const getSocialState = useServerFn(getBookSocialState);
  const updateFollow = useServerFn(setBookFollow);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(book.followers);
  const { books, communities } = useCatalogue();
  const community = book.communityId
    ? communities.find((c) => c.id === book.communityId)
    : undefined;
  const related = books.filter((b) => b.id !== book.id && b.genre === book.genre).slice(0, 6);
  const more = books.filter((b) => b.id !== book.id).slice(0, 6);
  const { data: socialState } = useQuery({
    queryKey: ["book-social", book.id, user?.id ?? "anon"],
    queryFn: () => getSocialState({ data: { bookId: book.id } }),
    enabled: Boolean(user),
  });
  const following = socialState?.following ?? false;

  const toggleFollow = async () => {
    if (!user) {
      await navigate({ to: "/auth" });
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const result = await updateFollow({ data: { bookId: book.id, follow: !following } });
      setFollowerCount(result.followers);
      queryClient.setQueryData(["book-social", book.id, user.id], {
        following: result.following,
      });
      await queryClient.invalidateQueries({ queryKey: catalogueQueryOptions.queryKey });
      toast.success(result.following ? "Following this book" : "Book unfollowed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update follow");
    } finally {
      setFollowBusy(false);
    }
  };

  const shareBook = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${book.title} by ${author.name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Book link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this book");
    }
  };

  return (
    <Shell title={book.title}>
      <section className="relative px-4 pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 h-72 opacity-40 blur-3xl"
          style={{
            backgroundImage: `radial-gradient(50% 50% at 50% 50%, oklch(0.6 0.22 ${book.hue}), transparent 70%)`,
          }}
        />
        <div className="relative flex gap-4">
          <div className="w-32 shrink-0 sm:w-40">
            <BookCover title={book.title} hue={book.hue} kind={book.kind} coverUrl={book.coverUrl} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight font-semibold">{book.title}</h1>
            <Link
              to="/author/$authorId"
              params={{ authorId: author.id }}
              className="mt-1 block text-sm text-muted-foreground hover:text-foreground"
            >
              by {author.name} {author.verified ? "✓" : ""}
            </Link>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-current text-accent" /> {book.rating.toFixed(1)}
              </span>
              <span className="opacity-40">·</span>
              <span>{formatCount(book.readers)} readers</span>
              <span className="opacity-40">·</span>
              <span>{formatCount(followerCount)} followers</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[book.genre, book.language, book.ageRating, `${book.year}`].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="rounded-2xl shadow-glow" asChild>
            <Link to="/book/$bookId/read" params={{ bookId: book.id }} search={{}}>
              <BookOpen className="size-4" /> Read now
            </Link>
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            disabled={followBusy}
            onClick={() => void toggleFollow()}
          >
            <Bookmark className={following ? "size-4 fill-current" : "size-4"} />
            {followBusy ? "Saving…" : following ? "Following" : "Follow"}
          </Button>
          {community ? (
            <Button variant="secondary" className="rounded-2xl" asChild>
              <Link to="/community/$communityId" params={{ communityId: community.id }}>
                <MessageCircle className="size-4" /> Discuss
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" className="rounded-2xl" asChild>
              <Link to="/community">
                <MessageCircle className="size-4" /> Discuss
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            aria-label="Share"
            title="Share this book"
            onClick={() => void shareBook()}
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </section>

      <section className="mt-7 px-4">
        <Tabs defaultValue="overview">
          <TabsList className="no-scrollbar w-full justify-start overflow-x-auto rounded-2xl bg-secondary/50">
            {["overview", "chapters", "community", "reviews", "author", "related"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-xl capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-foreground/90">{book.summary}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Chapters" value={`${book.chapters.length}`} />
              <Stat
                label="Reading time"
                value={`${book.chapters.reduce((s, c) => s + c.minutes, 0)} min`}
              />
              <Stat label="Age rating" value={book.ageRating} />
              <Stat label="Audiobook" value={book.audiobook ? "Available" : "—"} />
            </div>
            {book.audiobook ? (
              <div className="glass flex items-center gap-3 rounded-3xl p-4">
                <span className="grid size-11 place-items-center rounded-2xl trace-gradient text-primary-foreground">
                  <Headphones className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Listen instead</p>
                  <p className="text-xs text-muted-foreground">
                    Narrated edition with synced reading progress.
                  </p>
                </div>
              </div>
            ) : null}
            <TraceAIPanel
              context={book.title}
              suggestions={[
                "Explain this book",
                "Summarise the story so far",
                "Who are the main characters?",
                "Show me the major themes",
              ]}
              trigger={
                <Button variant="secondary" className="w-full rounded-2xl">
                  <Sparkles className="size-4" /> Ask Trace AI about this book
                </Button>
              }
            />
          </TabsContent>

          <TabsContent value="chapters" className="mt-4 space-y-2">
            {book.chapters.map((c) => (
              <Link
                key={c.id}
                to="/book/$bookId/read"
                params={{ bookId: book.id }}
                search={{ ch: c.index }}
                className="glass flex items-center gap-3 rounded-2xl p-3.5 transition-colors hover:bg-secondary/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/70 text-xs font-semibold">
                  {c.index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.excerpt}</p>
                </div>
                <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <p>{c.minutes} min</p>
                  <p className="text-primary">{formatCount(c.discussions)} talking</p>
                </div>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="community" className="mt-4">
            {community ? (
              <Link
                to="/community/$communityId"
                params={{ communityId: community.id }}
                className="glass block rounded-3xl p-5"
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-primary" /> {community.name}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatCount(community.members)} readers discussing this book ·{" "}
                  {formatCount(community.posts)} posts
                </p>
                <p className="mt-3 text-sm text-foreground/85">{community.description}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your next community might be waiting to be created.
              </p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            {[
              ["Njeri M.", "Finished it in two nights. The last chapter reframes everything."],
              ["Daniel O.", "Slow start, but the river becomes a character of its own."],
              ["Aisha", "The most honest book about crossing over I have read."],
            ].map(([name, text]) => (
              <div key={name} className="glass rounded-2xl p-4">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="author" className="mt-4">
            <Link
              to="/author/$authorId"
              params={{ authorId: author.id }}
              className="glass flex items-center gap-3 rounded-3xl p-4"
            >
              <span
                className="size-14 shrink-0 rounded-2xl"
                style={{
                  backgroundImage: `linear-gradient(140deg, oklch(0.6 0.2 ${author.hue}), oklch(0.28 0.1 ${author.hue + 30}))`,
                }}
              />
              <div>
                <p className="text-sm font-semibold">
                  {author.name} {author.verified ? "✓" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(author.followers)} followers · {formatCount(author.readers)} readers
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{author.bio}</p>
              </div>
            </Link>
          </TabsContent>

          <TabsContent value="related" className="mt-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {(related.length ? related : more).map((b) => (
                <BookCard key={b.id} book={b} className="w-full" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

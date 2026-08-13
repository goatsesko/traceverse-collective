import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart, MessageCircle, Users } from "lucide-react";

import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feed, formatCount, getBook, getCommunity } from "@/data/traceverse";

export const Route = createFileRoute("/community/$communityId")({
  loader: ({ params }) => {
    const community = getCommunity(params.communityId);
    if (!community) throw notFound();
    return { community, book: community.bookId ? getBook(community.bookId) : undefined };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Community — TraceVerse" }, { name: "robots", content: "noindex" }],
      };
    }
    const { community } = loaderData;
    const title = `${community.name} — TraceVerse Community`;
    return {
      meta: [
        { title },
        { name: "description", content: community.description.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: community.description.slice(0, 155) },
      ],
    };
  },
  component: CommunityPage,
});

function CommunityPage() {
  const { community, book } = Route.useLoaderData();

  return (
    <Shell title="Community">
      <div
        className="h-32 w-full"
        style={{
          backgroundImage: `linear-gradient(130deg, oklch(0.55 0.2 ${community.hue}), oklch(0.22 0.07 ${community.hue + 45}))`,
        }}
      />
      <section className="px-4 pt-4">
        <h1 className="font-display text-2xl font-semibold">{community.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3" /> {formatCount(community.members)} members ·{" "}
          {formatCount(community.posts)} posts
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="rounded-2xl shadow-glow">Join</Button>
          {book ? (
            <Button variant="secondary" className="rounded-2xl" asChild>
              <Link to="/book/$bookId" params={{ bookId: book.id }}>
                Open {book.title}
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-4">
        <Tabs defaultValue="discussions">
          <TabsList className="w-full justify-start rounded-2xl bg-secondary/50">
            {["discussions", "chapters", "quotes", "about"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-xl capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="discussions" className="mt-4 space-y-3">
            {feed.map((p) => (
              <article key={p.id} className="glass rounded-3xl p-4">
                <p className="text-sm font-semibold">{p.author}</p>
                <p
                  className={
                    p.spoiler
                      ? "mt-2 rounded-2xl bg-secondary/40 p-3 text-sm blur-[5px] transition select-none hover:blur-none"
                      : "mt-2 text-sm text-foreground/90"
                  }
                >
                  {p.body}
                </p>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="size-3.5" /> {formatCount(p.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3.5" /> {formatCount(p.comments)}
                  </span>
                </div>
              </article>
            ))}
          </TabsContent>

          <TabsContent value="chapters" className="mt-4 space-y-2">
            {(book?.chapters ?? []).map((c) => (
              <div key={c.id} className="glass flex items-center justify-between rounded-2xl p-4">
                <p className="text-sm font-semibold">
                  Chapter {c.index}: {c.title}
                </p>
                <p className="text-xs text-primary">{formatCount(c.discussions)} discussing</p>
              </div>
            ))}
            {!book ? (
              <p className="text-sm text-muted-foreground">
                This community is not tied to a single book.
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="quotes" className="mt-4 space-y-3">
            {feed
              .filter((p) => p.kind === "quote")
              .map((p) => (
                <blockquote key={p.id} className="glass rounded-3xl p-5 font-display text-lg">
                  {p.body}
                </blockquote>
              ))}
          </TabsContent>

          <TabsContent value="about" className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{community.description}</p>
            <p>Rules: be kind, mark spoilers, no piracy, no impersonation.</p>
          </TabsContent>
        </Tabs>
      </section>
    </Shell>
  );
}

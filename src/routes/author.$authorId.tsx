import { createFileRoute, notFound } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";

import { BookCard } from "@/components/traceverse/BookCard";
import { EmptyState } from "@/components/traceverse/EmptyState";
import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount } from "@/data/traceverse";
import { catalogueQueryOptions, useCatalogue } from "@/lib/catalogue-query";

export const Route = createFileRoute("/author/$authorId")({
  loader: async ({ context, params }) => {
    const catalogue = await context.queryClient.ensureQueryData(catalogueQueryOptions);
    const author = catalogue.authors.find((a) => a.id === params.authorId);
    if (!author) throw notFound();
    return { author };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Author — TraceVerse" }, { name: "robots", content: "noindex" }],
      };
    }
    const { author } = loaderData;
    const title = `${author.name} — Author on TraceVerse`;
    return {
      meta: [
        { title },
        { name: "description", content: author.bio.slice(0, 155) },
        { property: "og:title", content: title },
        { property: "og:description", content: author.bio.slice(0, 155) },
        { property: "og:type", content: "profile" },
      ],
    };
  },
  component: AuthorPage,
});

function AuthorPage() {
  const { author } = Route.useLoaderData();
  const { books } = useCatalogue();
  const works = books.filter((b) => b.authorId === author.id);

  return (
    <Shell title={author.name}>
      <div
        className="h-36 w-full"
        style={{
          backgroundImage: `linear-gradient(130deg, oklch(0.55 0.2 ${author.hue}), oklch(0.22 0.07 ${author.hue + 45}))`,
        }}
      />
      <section className="-mt-10 px-4">
        <span
          className="block size-20 rounded-3xl border-4 border-background"
          style={{
            backgroundImage: `linear-gradient(140deg, oklch(0.62 0.2 ${author.hue}), oklch(0.28 0.1 ${author.hue + 30}))`,
          }}
        />
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold">
          {author.name}
          {author.verified ? <BadgeCheck className="size-5 text-primary" /> : null}
        </h1>
        <p className="text-xs text-muted-foreground">
          {author.verified ? "Verified Author" : "Rising Author"} · {author.handle}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{author.bio}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {author.country}
        </p>
        <div className="mt-4 flex gap-5 text-sm">
          <span>
            <strong>{formatCount(author.followers)}</strong>{" "}
            <span className="text-muted-foreground">followers</span>
          </span>
          <span>
            <strong>{formatCount(author.readers)}</strong>{" "}
            <span className="text-muted-foreground">readers</span>
          </span>
        </div>
        <Button className="mt-4 rounded-2xl shadow-glow">Follow</Button>
      </section>

      <section className="mt-6 px-4">
        <Tabs defaultValue="books">
          <TabsList className="w-full justify-start rounded-2xl bg-secondary/50">
            {["books", "posts", "community", "about"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-xl capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="books" className="mt-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {works.map((b) => (
                <BookCard key={b.id} book={b} className="w-full" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-4 space-y-3">
            <div className="glass rounded-3xl p-4">
              <p className="text-sm">
                Working on the final chapters of the next book. Thank you for every note you have
                left in the margins — I read them all.
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">2 days ago</p>
            </div>
          </TabsContent>

          <TabsContent value="community" className="mt-4">
            <EmptyState
              icon={<BadgeCheck className="size-6" />}
              line={`Readers of ${author.name} — an official community lives here once the author opens it.`}
            />
          </TabsContent>

          <TabsContent value="about" className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{author.bio}</p>
            <p>Country: {author.country}</p>
            <p>Published works: {works.length}</p>
          </TabsContent>
        </Tabs>
      </section>
    </Shell>
  );
}

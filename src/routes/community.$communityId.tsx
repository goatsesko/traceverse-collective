import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, MessageCircle, Users } from "lucide-react";
import { useState } from "react";

import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { formatCount } from "@/data/traceverse";
import { catalogueQueryOptions } from "@/lib/catalogue-query";
import {
  createCommunityPost,
  getCommunityRoom,
  getMyMembership,
  setMembership,
} from "@/lib/community.functions";

export const Route = createFileRoute("/community/$communityId")({
  loader: async ({ context, params }) => {
    const catalogue = await context.queryClient.ensureQueryData(catalogueQueryOptions);
    const community = catalogue.communities.find((c) => c.id === params.communityId);
    if (!community) throw notFound();
    const book = community.bookId
      ? catalogue.books.find((b) => b.id === community.bookId)
      : undefined;
    return { community, book };
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
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const roomFn = useServerFn(getCommunityRoom);
  const membershipFn = useServerFn(getMyMembership);
  const toggleFn = useServerFn(setMembership);
  const postFn = useServerFn(createCommunityPost);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const roomKey = ["community-room", community.id];
  const { data: room } = useQuery({
    queryKey: roomKey,
    queryFn: () => roomFn({ data: { communityId: community.id } }),
  });
  const { data: membership } = useQuery({
    queryKey: ["community-membership", community.id, user?.id ?? "anon"],
    queryFn: () => membershipFn({ data: { communityId: community.id } }),
    enabled: Boolean(user),
  });

  const feed = room?.posts ?? [];
  const memberCount = room?.members ?? community.members;
  const isMember = membership?.member ?? false;

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: roomKey }),
      qc.invalidateQueries({ queryKey: ["community-membership", community.id] }),
      qc.invalidateQueries({ queryKey: catalogueQueryOptions.queryKey }),
    ]);
  };

  const toggleJoin = async () => {
    if (!user) return navigate({ to: "/auth" });
    setBusy(true);
    try {
      await toggleFn({ data: { communityId: community.id, join: !isMember } });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await postFn({ data: { communityId: community.id, body: draft } });
      setDraft("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

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
          <Users className="size-3" /> {formatCount(memberCount)} members ·{" "}
          {formatCount(feed.length)} posts
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            className="rounded-2xl shadow-glow"
            variant={isMember ? "secondary" : "default"}
            disabled={busy}
            onClick={() => void toggleJoin()}
          >
            {isMember ? "Joined" : "Join"}
          </Button>
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
            <div className="glass space-y-3 rounded-3xl p-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={user ? "Start a discussion…" : "Sign in to join the conversation"}
                className="min-h-20 rounded-2xl bg-secondary/50"
              />
              <Button
                className="rounded-2xl"
                disabled={busy || !draft.trim()}
                onClick={() => void submitPost()}
              >
                {busy ? "Posting…" : "Post"}
              </Button>
            </div>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No discussions yet — be the first to leave a trace.
              </p>
            ) : null}
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

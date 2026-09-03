import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Users } from "lucide-react";
import { useState } from "react";

import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatCount } from "@/data/traceverse";
import { catalogueQueryOptions, useCatalogue } from "@/lib/catalogue-query";
import { createCommunity } from "@/lib/community.functions";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Communities — TraceVerse" },
      {
        name: "description",
        content:
          "Book communities, author communities and reader circles. Discuss chapters, theories and quotes on TraceVerse.",
      },
      { property: "og:title", content: "Communities — TraceVerse" },
      {
        property: "og:description",
        content: "Join reader circles, discuss chapters and follow the conversation around books.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogueQueryOptions),
  component: CommunityIndex,
});

function CommunityIndex() {
  const { communities, feed } = useCatalogue();
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createCommunity);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await create({ data: { name, description } });
      await qc.invalidateQueries({ queryKey: ["catalogue"] });
      setOpen(false);
      setName("");
      setDescription("");
      navigate({ to: "/community/$communityId", params: { communityId: res.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the community.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Community">
      <section className="px-4 pt-5">
        <h1 className="font-display text-2xl font-semibold">Where readers meet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Book communities, author circles and interest groups.
        </p>
        <Button
          variant="secondary"
          className="mt-4 rounded-2xl"
          onClick={() => (user ? setOpen((v) => !v) : navigate({ to: "/auth" }))}
        >
          <Plus className="size-4" /> Create a community
        </Button>
        {open ? (
          <div className="glass mt-3 space-y-3 rounded-3xl p-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Community name"
              className="rounded-2xl bg-secondary/50"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this circle about?"
              className="min-h-20 rounded-2xl bg-secondary/50"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button className="rounded-2xl" disabled={busy} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3 px-4 sm:grid-cols-2">
        {communities.map((c) => (
          <Link
            key={c.id}
            to="/community/$communityId"
            params={{ communityId: c.id }}
            className="glass rounded-3xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <div
              className="mb-3 h-20 rounded-2xl"
              style={{
                backgroundImage: `linear-gradient(120deg, oklch(0.55 0.2 ${c.hue}), oklch(0.24 0.08 ${c.hue + 40}))`,
              }}
            />
            <p className="flex items-center gap-2 text-sm font-semibold">
              {c.name}
              {c.official ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                  Official
                </span>
              ) : null}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="size-3" /> {formatCount(c.members)} members ·{" "}
              {formatCount(c.posts)} posts
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Most discussed today</h2>
        <div className="space-y-3">
          {feed
            .filter((p) => p.kind === "discussion" || p.kind === "confession")
            .map((p) => (
              <div key={p.id} className="glass rounded-3xl p-4">
                <p className="text-sm font-semibold">{p.author}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
        </div>
      </section>
    </Shell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Flame, Clock, BookOpen, Bookmark, Users, LogOut, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookCard } from "@/components/traceverse/BookCard";
import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { catalogueQueryOptions, useCatalogue } from "@/lib/catalogue-query";
import { becomeProfessional, getMyDashboard, updateMyProfile } from "@/lib/profile.functions";

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
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogueQueryOptions),
  component: ProfilePage,
});

function ProfilePage() {
  const { books } = useCatalogue();
  const { user, loading, signOut } = useAuth();
  const fetchDashboard = useServerFn(getMyDashboard);
  const saveProfile = useServerFn(updateMyProfile);
  const upgradeFn = useServerFn(becomeProfessional);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");

  const dash = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboard(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!dash.data) return;
    setDisplayName(dash.data.profile.displayName ?? "");
    setBio(dash.data.profile.bio ?? "");
    setCountry(dash.data.profile.country ?? "");
  }, [dash.data]);

  const save = useMutation({
    mutationFn: () => saveProfile({ data: { displayName, bio, country } }),
    onSuccess: async () => {
      toast.success("Profile updated");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const upgrade = useMutation({
    mutationFn: () => upgradeFn({}),
    onSuccess: async () => {
      toast.success("Welcome to Professional — you can now upload and publish.");
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not switch account"),
  });

  if (!loading && !user) {
    return (
      <Shell title="Profile">
        <section className="px-4 pt-16 text-center">
          <span className="mx-auto block size-16 rounded-3xl trace-gradient shadow-glow" />
          <h1 className="mt-5 font-display text-xl font-semibold">Your reading life, saved</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Sign in to keep your streaks, badges, library and Trace AI history across devices.
          </p>
          <Button asChild className="mt-6 rounded-2xl">
            <Link to="/auth">Sign in or create an account</Link>
          </Button>
        </section>
      </Shell>
    );
  }

  const profile = dash.data?.profile;
  const stats = dash.data?.stats;
  const continueIds = new Set((dash.data?.continueReading ?? []).map((c) => c.bookId));
  const continueBooks = books.filter((b) => continueIds.has(b.id));

  return (
    <Shell title="Profile">
      <section className="px-4 pt-6">
        <div className="flex items-center gap-4">
          <span className="size-18 rounded-3xl trace-gradient shadow-glow" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold">
              {profile?.displayName ?? user?.email?.split("@")[0] ?? "Reader"}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              @{profile?.handle ?? "reader"}
              {profile?.country ? ` · ${profile.country}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(stats?.hoursRead ?? 0) >= 100 ? "Deep Reader" : "Rising Reader"} ·{" "}
              {profile?.streakDays ?? 0} day streak
            </p>
          </div>
          <Button
            variant="secondary"
            className="ml-auto rounded-2xl"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </Button>
        </div>

        {profile?.bio && !editing ? (
          <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>
        ) : null}

        {editing ? (
          <form
            className="glass mt-4 space-y-3 rounded-3xl p-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="dn">Display name</Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-2xl bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                maxLength={280}
                onChange={(e) => setBio(e.target.value)}
                className="rounded-2xl bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-2xl bg-secondary/50"
              />
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full rounded-2xl">
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            icon={<Flame className="size-4" />}
            value={String(profile?.streakDays ?? 0)}
            label="Day streak"
          />
          <Metric
            icon={<BookOpen className="size-4" />}
            value={String(stats?.booksRead ?? 0)}
            label="Books read"
          />
          <Metric
            icon={<Clock className="size-4" />}
            value={`${stats?.hoursRead ?? 0}h`}
            label="Hours read"
          />
          <Metric
            icon={<Award className="size-4" />}
            value={String(stats?.badges ?? 0)}
            label="Badges"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Metric
            icon={<BookOpen className="size-4" />}
            value={String(stats?.inProgress ?? 0)}
            label="Reading now"
          />
          <Metric
            icon={<Bookmark className="size-4" />}
            value={String(stats?.bookmarks ?? 0)}
            label="Saved"
          />
          <Metric
            icon={<Users className="size-4" />}
            value={String(stats?.following ?? 0)}
            label="Following"
          />
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Continue reading</h2>
        {continueBooks.length ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {continueBooks.slice(0, 5).map((b) => (
              <BookCard key={b.id} book={b} className="w-full" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing in progress yet — open a book and it will show up here.
          </p>
        )}
      </section>

      <section className="mt-8 px-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Badges</h2>
        {dash.data?.badges.length ? (
          <div className="flex flex-wrap gap-2">
            {dash.data.badges.map((b) => (
              <span key={b.id} className="glass rounded-2xl px-3 py-2 text-xs text-muted-foreground">
                {b.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Read, publish and join discussions to start earning badges.
          </p>
        )}
      </section>

      <section className="mt-8 px-4">
        <Button
          variant="secondary"
          className="w-full rounded-2xl"
          onClick={async () => {
            await signOut();
            toast.success("Signed out");
          }}
        >
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
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

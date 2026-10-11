import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CheckCircle2, ImagePlus, Sparkles, Users, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BookCover } from "@/components/traceverse/BookCover";
import { Shell } from "@/components/traceverse/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { clearCover, generateCover, setCoverFromUpload } from "@/lib/covers.functions";
import {
  createBookCommunity,
  getDraftBook,
  publishBook,
  updateDraftMetadata,
} from "@/lib/publish.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/publish/$bookId")({
  head: () => ({
    meta: [
      { title: "Review & publish — TraceVerse" },
      {
        name: "description",
        content:
          "Preview your imported book, edit its details and publish it to TraceVerse readers.",
      },
      { property: "og:title", content: "Review & publish — TraceVerse" },
      {
        property: "og:description",
        content: "Check chapters, set genre, language and age rating, then go live.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublishPage,
});

const ratings = ["everyone", "teen", "young-adult", "mature"] as const;
const hues = [280, 320, 250, 200, 160, 30];

function PublishPage() {
  const { bookId } = Route.useParams();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();

  const load = useServerFn(getDraftBook);
  const saveFn = useServerFn(updateDraftMetadata);
  const publishFn = useServerFn(publishBook);
  const communityFn = useServerFn(createBookCommunity);

  const draft = useQuery({
    queryKey: ["draft-book", bookId],
    queryFn: () => load({ data: { bookId } }),
    enabled: Boolean(user),
  });

  const [form, setForm] = useState({
    title: "",
    authorName: "",
    summary: "",
    genre: "",
    language: "",
    ageRating: "everyone",
    hue: 280,
    publisher: "",
    originalAuthor: "",
    rightsConfirmed: false,
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [askCommunity, setAskCommunity] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.data) return;
    setForm({
      title: draft.data.title,
      authorName: draft.data.authorName,
      summary: draft.data.summary,
      genre: draft.data.genre,
      language: draft.data.language,
      ageRating: draft.data.ageRating,
      hue: draft.data.hue,
      publisher: draft.data.publisher ?? "",
      originalAuthor: draft.data.originalAuthor ?? "",
      rightsConfirmed: draft.data.rightsConfirmed,
    });
    setCoverUrl(draft.data.coverUrl);
  }, [draft.data]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { bookId, ...form } }),
    onSuccess: async () => {
      setNote("Details saved.");
      await qc.invalidateQueries({ queryKey: ["draft-book", bookId] });
    },
    onError: (e: Error) => setNote(e.message),
  });

  const setCoverFn = useServerFn(setCoverFromUpload);
  const genCoverFn = useServerFn(generateCover);
  const clearCoverFn = useServerFn(clearCover);

  /** Upload the chosen image privately, then promote it to the book's cover. */
  const onCoverFile = async (file: File) => {
    if (!user || coverBusy) return;
    setCoverBusy("upload");
    setNote(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/cover-${Date.now()}-${safe}`;
      const base = import.meta.env["VITE_SUPABASE_URL"] as string;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${base}/storage/v1/object/book-uploads/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader(
          "apikey",
          import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
        );
        xhr.setRequestHeader("x-upsert", "true");
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("We could not store that image."));
        xhr.onerror = () => reject(new Error("Network problem while uploading."));
        xhr.send(file);
      });
      const res = await setCoverFn({ data: { bookId, path, mime: file.type } });
      setCoverUrl(res.coverUrl);
      setNote("Cover updated.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not set the cover.");
    } finally {
      setCoverBusy(null);
    }
  };

  const onGenerateCover = async () => {
    if (coverBusy) return;
    setCoverBusy("generate");
    setNote(null);
    try {
      await saveFn({ data: { bookId, ...form } });
      const res = await genCoverFn({ data: { bookId } });
      setCoverUrl(res.coverUrl);
      setNote("Trace AI designed your cover.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not generate a cover.");
    } finally {
      setCoverBusy(null);
    }
  };

  const onClearCover = async () => {
    if (coverBusy) return;
    setCoverBusy("clear");
    try {
      await clearCoverFn({ data: { bookId } });
      setCoverUrl(null);
      setNote("Cover removed — the colour cover is back.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not remove the cover.");
    } finally {
      setCoverBusy(null);
    }
  };

  const publish = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { bookId, ...form } });
      return publishFn({ data: { bookId } });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["catalogue"] });
      setAskCommunity(true);
    },
    onError: (e: Error) => setNote(e.message),
  });

  const makeCommunity = useMutation({
    mutationFn: () => communityFn({ data: { bookId } }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["catalogue"] });
      navigate({ to: "/community/$communityId", params: { communityId: res.communityId } });
    },
    onError: (e: Error) => setNote(e.message),
  });

  const book = draft.data;
  const chapter = book?.chapters[chapterIdx];

  return (
    <Shell title="Review & publish">
      {draft.isLoading || !book ? (
        <section className="px-4 pt-6">
          <p className="text-sm text-muted-foreground">
            {draft.error instanceof Error
              ? draft.error.message
              : "Loading your processed book…"}
          </p>
        </section>
      ) : askCommunity ? (
        <section className="px-4 pt-8">
          <div className="glass rounded-3xl p-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl trace-gradient text-primary-foreground shadow-glow">
              <CheckCircle2 className="size-6" />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold">{book.title} is live.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Would you like us to create a community for this book?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                className="rounded-2xl"
                disabled={makeCommunity.isPending}
                onClick={() => makeCommunity.mutate()}
              >
                <Users className="size-4" /> Create Community
              </Button>
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => navigate({ to: "/book/$bookId", params: { bookId } })}
              >
                Maybe Later
              </Button>
            </div>
            {note ? <p className="mt-3 text-xs text-primary">{note}</p> : null}
          </div>
        </section>
      ) : (
        <>
          <section className="flex gap-4 px-4 pt-5">
            <div className="w-24 shrink-0">
              <BookCover
                title={form.title}
                author={form.authorName}
                hue={form.hue}
                coverUrl={coverUrl}
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold">Review your import</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {book.chapters.length} chapters detected · original file stored securely.
              </p>
              {book.processingError ? (
                <p className="mt-2 text-xs text-destructive">{book.processingError}</p>
              ) : null}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onCoverFile(f);
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-2xl"
                  disabled={coverBusy !== null}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  {coverBusy === "upload" ? "Uploading…" : "Upload cover"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-2xl"
                  disabled={coverBusy !== null}
                  onClick={() => void onGenerateCover()}
                >
                  <Wand2 className="size-4" />
                  {coverBusy === "generate" ? "Designing…" : "Trace AI cover"}
                </Button>
                {coverUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-2xl text-muted-foreground"
                    disabled={coverBusy !== null}
                    onClick={() => void onClearCover()}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {!coverUrl ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {hues.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-label={`Cover colour ${h}`}
                      onClick={() => setForm((f) => ({ ...f, hue: h }))}
                      className={cn(
                        "size-7 rounded-full border",
                        form.hue === h ? "border-primary" : "border-border",
                      )}
                      style={{ background: `oklch(0.55 0.2 ${h})` }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-6 px-4">
            <h2 className="font-display text-lg font-semibold">Book details</h2>
            <div className="mt-3 space-y-3">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="rounded-2xl bg-secondary/50"
              />
              <Input
                value={form.authorName}
                onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                placeholder="Author name"
                className="rounded-2xl bg-secondary/50"
              />
              <Textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Description"
                rows={4}
                className="rounded-2xl bg-secondary/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={form.genre}
                  onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                  placeholder="Genre"
                  className="rounded-2xl bg-secondary/50"
                />
                <Input
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  placeholder="Language"
                  className="rounded-2xl bg-secondary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={form.originalAuthor}
                  onChange={(e) => setForm((f) => ({ ...f, originalAuthor: e.target.value }))}
                  placeholder="Original author (if not you)"
                  className="rounded-2xl bg-secondary/50"
                />
                <Input
                  value={form.publisher}
                  onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
                  placeholder="Publisher"
                  className="rounded-2xl bg-secondary/50"
                />
              </div>
              <label className="glass flex cursor-pointer items-start gap-3 rounded-2xl p-3.5">
                <input
                  type="checkbox"
                  checked={form.rightsConfirmed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rightsConfirmed: e.target.checked }))
                  }
                  className="mt-0.5 size-4 accent-[oklch(0.55_0.2_300)]"
                />
                <span className="text-xs text-muted-foreground">
                  I confirm I hold the rights to publish this work, and I credit the original
                  author and publisher above where they are not me.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ratings.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, ageRating: r }))}
                    className={cn(
                      "rounded-2xl px-3 py-1.5 text-xs capitalize",
                      form.ageRating === r
                        ? "trace-gradient text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground",
                    )}
                  >
                    {r.replace("-", " ")}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                className="w-full rounded-2xl"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save details"}
              </Button>
            </div>
          </section>

          <section className="mt-7 px-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <BookOpen className="size-4 text-primary" /> Reader preview
            </h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {book.chapters.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChapterIdx(i)}
                  className={cn(
                    "shrink-0 rounded-2xl px-3 py-1.5 text-xs",
                    i === chapterIdx
                      ? "trace-gradient text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground",
                  )}
                >
                  {c.idx}. {c.title.slice(0, 22)}
                </button>
              ))}
            </div>
            {chapter ? (
              <article
                className="glass mt-3 max-h-[60vh] overflow-y-auto rounded-3xl p-5"
                style={{ fontFamily: "var(--font-reading)" }}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Chapter {chapter.idx} · {chapter.minutes} min
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold">{chapter.title}</h3>
                <div
                  className="mt-4 space-y-4 text-[15px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: chapter.bodyHtml }}
                />
              </article>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No chapters were produced from this file.
              </p>
            )}
          </section>

          <section className="mt-7 px-4">
            <div className="glass rounded-3xl p-5">
              <p className="flex items-center gap-2 font-display text-base font-semibold">
                <Sparkles className="size-4 text-primary" /> Ready when you are
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Publishing makes this book visible in Home, Library, Search and its Book Page.
              </p>
              <Button
                className="mt-4 w-full rounded-2xl"
                disabled={publish.isPending || !book.chapters.length}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? "Publishing…" : "Publish book"}
              </Button>
              {note ? <p className="mt-3 text-xs text-primary">{note}</p> : null}
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

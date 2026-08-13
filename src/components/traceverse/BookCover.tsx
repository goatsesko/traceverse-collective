import { cn } from "@/lib/utils";

interface BookCoverProps {
  title: string;
  author?: string;
  hue: number;
  className?: string;
  kind?: string;
}

/**
 * Generated cover art. Real covers replace the gradient once the
 * Import Studio produces an ImageAsset for the book.
 */
export function BookCover({ title, author, hue, className, kind }: BookCoverProps) {
  return (
    <div
      className={cn(
        "relative isolate flex aspect-[2/3] w-full flex-col justify-end overflow-hidden rounded-2xl p-3 shadow-float",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(150deg, oklch(0.55 0.20 ${hue}) 0%, oklch(0.32 0.14 ${hue + 22}) 55%, oklch(0.16 0.05 ${hue + 40}) 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `radial-gradient(80% 55% at 20% 8%, oklch(1 0 0 / 26%) 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, oklch(1 0 0 / 12%) 0px, transparent 2px, transparent 22px)",
        }}
      />
      {kind ? (
        <span className="absolute left-3 top-3 rounded-full bg-background/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/85 backdrop-blur-sm">
          {kind}
        </span>
      ) : null}
      <div className="relative">
        <p className="font-display text-sm leading-tight font-semibold text-foreground drop-shadow-sm">
          {title}
        </p>
        {author ? (
          <p className="mt-1 text-[11px] text-foreground/70">{author}</p>
        ) : null}
      </div>
    </div>
  );
}

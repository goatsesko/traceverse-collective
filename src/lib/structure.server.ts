/**
 * Manuscript structuring for Import Studio.
 * Turns raw extracted text into ordered semantic sections (front matter,
 * chapters, ending matter) instead of arbitrary size-based splits.
 */
import type { SectionKind } from "@/data/traceverse";

export interface StructuredSection {
  section: SectionKind;
  title: string;
  paragraphs: string[];
}

const KEYWORDS: [RegExp, SectionKind | "skip"][] = [
  [/^(table of )?contents$/i, "skip"],
  [/^copyright\b|^all rights reserved/i, "skip"],
  [/^dedication$/i, "dedication"],
  [/^epigraph$/i, "epigraph"],
  [/^(preface|foreword)\b/i, "preface"],
  [/^introduction\b/i, "introduction"],
  [/^prologue\b/i, "prologue"],
  [/^part\s+([\dIVXLC]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i, "part"],
  [/^chapter\s+([\dIVXLC]+|[a-z-]+)\b/i, "chapter"],
  [/^epilogue\b/i, "epilogue"],
  [/^afterword\b/i, "afterword"],
  [/^(acknowledg(e)?ments|author'?s note|a note from the author|about the author|notes)\b/i, "endnotes"],
];

function classify(line: string): SectionKind | "skip" | null {
  const t = line.trim();
  if (!t || t.length > 80) return null;
  for (const [re, kind] of KEYWORDS) {
    if (re.test(t)) {
      // Prose sentences that merely start with a keyword aren't headings.
      if (kind !== "chapter" && kind !== "part" && /[.!?]$/.test(t) && t.split(" ").length > 6) return null;
      return kind;
    }
  }
  return null;
}

/** Remove layout-only page furniture without rewriting manuscript words. */
function cleanText(raw: string): string[] {
  let lines = raw.replace(/\r/g, "").replace(/\u00ad/g, "").split("\n");
  const counts = new Map<string, number>();
  for (const l of lines) {
    const k = l.trim();
    if (k && k.length < 60 && !classify(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  lines = lines.filter((l) => {
    const k = l.trim();
    if (/^(page\s*)?\d{1,4}$/i.test(k)) return false;
    return !(k && (counts.get(k) ?? 0) >= 4);
  });
  return lines.join("\n").replace(/[ \t]+/g, " ").split("\n");
}

function toParagraphs(text: string): string[] {
  const raw = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of raw) {
    const prev = out[out.length - 1];
    // Joining wrapped lines changes layout only; every extracted character stays intact.
    if (prev && !/[.!?:"”')\]]$/.test(prev) && /^[a-z(,;]/.test(p)) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
  }
  return out;
}

const DEFAULT_TITLES: Partial<Record<SectionKind, string>> = {
  front: "Title Page",
  dedication: "Dedication",
  epigraph: "Epigraph",
};

export function structureManuscript(raw: string, bookTitle: string): StructuredSection[] {
  const lines = cleanText(raw);
  type Seg = { section: SectionKind | "skip"; title: string; body: string[] };
  const segs: Seg[] = [{ section: "front", title: "", body: [] }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const kind = classify(line);
    if (!kind) {
      segs[segs.length - 1]!.body.push(lines[i]!);
      continue;
    }
    let title = line;
    // "Chapter 1" followed by a short subtitle line → "Chapter 1: Subtitle"
    const next = lines[i + 1]?.trim() ?? "";
    if (
      (kind === "chapter" || kind === "part") &&
      /^(chapter|part)\s+\S+$/i.test(line) &&
      next && next.length < 70 && !/[.,;]$/.test(next) && !classify(next)
    ) {
      title = `${line}: ${next}`;
      i++;
    }
    segs.push({ section: kind, title, body: [] });
  }

  const sized = (s: Seg) => s.body.join(" ").replace(/\s/g, "").length;
  const kept: StructuredSection[] = [];
  let pendingPart = "";
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s.section === "skip") continue;
    const len = sized(s);
    // Table-of-contents remnants have no body. Keep every authored chapter with content.
    if (s.section === "chapter" && len === 0) continue;
    if (s.section === "part" && len < 200) {
      pendingPart = s.title;
      continue;
    }
    if (s.section === "front" && len === 0) continue;
    const paragraphs = toParagraphs(s.body.join("\n"));
    if (!paragraphs.length) continue;
    let title = s.title || DEFAULT_TITLES[s.section] || bookTitle;
    if (s.section === "chapter" && pendingPart) {
      title = `${pendingPart} · ${title}`;
      pendingPart = "";
    }
    // A repeated chapter heading (e.g. TOC entry with a blurb) — keep the fuller one.
    const dup = kept.findIndex((k) => k.section === s.section && k.title.toLowerCase() === title.toLowerCase());
    if (dup >= 0) {
      if (kept[dup]!.paragraphs.join(" ").length < paragraphs.join(" ").length) kept.splice(dup, 1);
      else continue;
    }
    kept.push({ section: s.section, title, paragraphs });
  }

  // No chapter headings found: split body into balanced reading units.
  if (!kept.some((k) => k.section === "chapter")) {
    const bodySrc = kept.find((k) => k.section === "front") ?? kept[kept.length - 1];
    const others = kept.filter((k) => k !== bodySrc);
    const paras = bodySrc?.paragraphs ?? toParagraphs(lines.join("\n"));
    const per = Math.max(6, Math.ceil(paras.length / 12));
    const chapters: StructuredSection[] = [];
    for (let i = 0; i < paras.length; i += per) {
      chapters.push({ section: "chapter", title: `Chapter ${chapters.length + 1}`, paragraphs: paras.slice(i, i + per) });
    }
    const head = others.filter((o) => !["epilogue", "afterword", "endnotes"].includes(o.section));
    const tail = others.filter((o) => ["epilogue", "afterword", "endnotes"].includes(o.section));
    return [...head, ...chapters, ...tail];
  }
  return kept;
}

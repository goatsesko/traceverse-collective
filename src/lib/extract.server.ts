/**
 * Server-only text extraction for Import Studio uploads.
 * Pure-JS / WASM-free paths so it runs inside the edge worker runtime.
 */
import { unzipSync, strFromU8 } from "fflate";

export type SourceKind = "pdf" | "docx" | "epub" | "text" | "html" | "unsupported";

export function detectKind(filename: string, mime = ""): SourceKind {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
  if (ext === "epub" || mime.includes("epub")) return "epub";
  if (ext === "html" || ext === "htm") return "html";
  if (["txt", "md", "markdown", "text"].includes(ext)) return "text";
  return "unsupported";
}

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return pages
    .map((page) =>
      page
        // Only normalize layout whitespace. Never rewrite the author's characters or words.
        .replace(/\n{2,}/g, "\n\n")
        .replace(/([^\n.:;!?"'])\n(?=[a-z(])/g, "$1 ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

function xmlDocxToText(xml: string): string {
  return xml
    .replace(/<w:tab[^>]*\/>/g, " ")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("This DOCX has no readable document body.");
  return xmlDocxToText(strFromU8(doc));
}

function extractEpub(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const names = Object.keys(files)
    .filter((n) => /\.x?html?$/i.test(n))
    .sort();
  const parts = names
    .map((n) => stripHtml(strFromU8(files[n]!)))
    .filter((t) => t.replace(/\s/g, "").length > 40);
  if (!parts.length) throw new Error("This EPUB has no readable chapters.");
  return parts.join("\n\n");
}

/** Returns plain text for any supported upload. Throws with a readable message otherwise. */
export async function extractUploadText(
  buffer: ArrayBuffer,
  filename: string,
  mime = "",
): Promise<{ text: string; kind: SourceKind }> {
  const kind = detectKind(filename, mime);
  const decode = () => new TextDecoder().decode(new Uint8Array(buffer));

  switch (kind) {
    case "pdf":
      return { text: await extractPdf(buffer), kind };
    case "docx":
      return { text: extractDocx(buffer), kind };
    case "epub":
      return { text: extractEpub(buffer), kind };
    case "html":
      return { text: stripHtml(decode()), kind };
    case "text":
      return { text: decode(), kind };
    default:
      throw new Error("Unsupported file type. Use PDF, EPUB, DOCX, TXT, Markdown or HTML.");
  }
}

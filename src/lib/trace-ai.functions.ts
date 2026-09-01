import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type TraceAITask =
  | "chat"
  | "summary"
  | "analysis"
  | "explain"
  | "recommend"
  | "quiz"
  | "flashcards"
  | "translate"
  | "creator";

export interface TraceAIInput {
  task: TraceAITask;
  prompt: string;
  /** Human-readable context label (book, chapter, profile…). */
  context?: string;
  /** Optional passage/excerpt the model should ground its answer in. */
  passage?: string;
  /** Target language for translate tasks. */
  language?: string;
  contextRef?: string;
}

export interface TraceAIResult {
  text: string;
  task: TraceAITask;
  limited?: boolean;
}

const SYSTEM: Record<TraceAITask, string> = {
  chat: "Answer the reader's question about the work. Be warm, concise and spoiler-aware.",
  summary: "Summarise clearly in short paragraphs, no spoilers beyond what is provided.",
  analysis: "Analyse themes, structure, characters and craft. Be specific and grounded.",
  explain: "Explain the passage in plain language a curious reader would enjoy.",
  recommend: "Recommend 3-5 titles with one sentence each on why they fit.",
  quiz: "Write 5 comprehension questions with answers, numbered.",
  flashcards: "Write 8 flashcards as 'Q: … / A: …' lines.",
  translate: "Translate faithfully, preserving tone and literary register.",
  creator: "Help the creator with titles, blurbs, readability and age-rating advice.",
};

/** Free-tier daily message allowance for signed-in readers. */
const FREE_DAILY_MESSAGES = 40;

/**
 * Trace AI gateway. The frontend never sees provider keys or model names —
 * the underlying model can be swapped here without touching any UI.
 */
export const askTraceAI = createServerFn({ method: "POST" })
  .inputValidator((input: TraceAIInput) => {
    if (!input?.prompt?.trim()) throw new Error("Empty prompt");
    return { ...input, prompt: input.prompt.slice(0, 4000) };
  })
  .handler(async ({ data }): Promise<TraceAIResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { text: "Trace AI is not configured yet.", task: data.task };
    }

    // Optional identity: Trace AI works signed-out, but usage is metered per user.
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const anon = createClient(url, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const token = authHeader.slice(7);
        const { data: claims } = await anon.auth.getClaims(token);
        userId = (claims?.claims?.sub as string | undefined) ?? null;
      } catch {
        userId = null;
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (userId) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("ai_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);
      if ((count ?? 0) >= FREE_DAILY_MESSAGES) {
        return {
          task: data.task,
          limited: true,
          text: "You've reached today's free Trace AI limit. It resets in 24 hours — Trace AI Premium will lift it entirely.",
        };
      }
    }

    const model = "google/gemini-2.5-flash";
    const parts = [
      data.context ? `Context: ${data.context}` : "",
      data.language ? `Target language: ${data.language}` : "",
      data.passage ? `Passage:\n"""${data.passage.slice(0, 6000)}"""` : "",
      data.prompt,
    ].filter(Boolean);

    let text = "";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are Trace AI, the reading intelligence of TraceVerse by Trace Organization. ${SYSTEM[data.task] ?? SYSTEM.chat} Never mention which AI provider or model powers you.`,
            },
            { role: "user", content: parts.join("\n\n") },
          ],
        }),
      });

      if (res.status === 429) {
        return { task: data.task, limited: true, text: "Trace AI is busy right now. Try again in a moment." };
      }
      if (res.status === 402) {
        return { task: data.task, limited: true, text: "Trace AI credits are exhausted for this workspace." };
      }
      if (!res.ok) throw new Error(`gateway ${res.status}`);

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      text = json.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      console.error("[trace-ai] gateway error", err);
      return { task: data.task, text: "Trace AI couldn't answer that just now. Please try again." };
    }

    try {
      await supabaseAdmin.from("ai_usage").insert({
        user_id: userId,
        task: data.task,
        model,
        context_ref: data.contextRef ?? data.context ?? null,
        input_chars: parts.join("\n\n").length,
        output_chars: text.length,
      });
    } catch (err) {
      console.error("[trace-ai] usage log failed", err);
    }

    return { task: data.task, text: text || "No answer was generated." };
  });

import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send } from "lucide-react";
import { useState } from "react";

import { askTraceAI, type TraceAITask } from "@/lib/trace-ai.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Trace AI surface. The UI talks to a provider-agnostic gateway, so the
 * underlying foundation model can change without touching this component.
 */
export function TraceAIPanel({
  context,
  suggestions,
  trigger,
  task = "chat",
  passage,
  contextRef,
}: {
  context: string;
  suggestions: string[];
  trigger?: React.ReactNode;
  task?: TraceAITask;
  passage?: string;
  contextRef?: string;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const send = useServerFn(askTraceAI);

  const ask = async (q: string) => {
    if (!q.trim() || pending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setValue("");
    setPending(true);
    try {
      const res = await send({
        data: {
          task,
          prompt: q,
          context,
          ...(passage ? { passage } : {}),
          ...(contextRef ? { contextRef } : {}),
        },
      });
      setMessages((m) => [...m, { role: "ai", text: res.text }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Trace AI couldn't answer that just now. Please try again." },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" className="rounded-2xl">
            <Sparkles className="size-4" /> Ask Trace AI
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="glass flex h-[80dvh] flex-col rounded-t-3xl border-x-0 p-0 pt-4"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <span className="grid size-7 place-items-center rounded-lg trace-gradient text-primary-foreground">
              <Sparkles className="size-3.5" />
            </span>
            Trace AI
          </SheetTitle>
          <SheetDescription>Reading context: {context}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-2xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[80%] rounded-2xl trace-gradient px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-2xl bg-secondary/60 px-3 py-2 text-sm whitespace-pre-wrap"
                }
              >
                {m.text}
              </div>
            ))
          )}
          {pending ? (
            <div className="max-w-[85%] rounded-2xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              Trace AI is thinking…
            </div>
          ) : null}
        </div>

        <form
          className="flex items-center gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(value);
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask anything about this book…"
            className="rounded-2xl bg-secondary/50"
          />
          <Button type="submit" size="icon" className="rounded-2xl">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

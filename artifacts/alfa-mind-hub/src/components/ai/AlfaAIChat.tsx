import { useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { chatWithAlfa, type AlfaChatMessage } from "@workspace/api-client-react";

type ChatMessage = AlfaChatMessage & { id: string };

const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I’m Alfa AI. Tell me what you’re teaching, the age group, or the kind of printable activity you need.",
};

const suggestions = [
  "Plan a 10-minute counting activity for ages 4–5",
  "How can I adapt phonics for Grade 1?",
  "Give me a calm sensory-learning idea",
];

function messageId(): string {
  return `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AlfaAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: messageId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const result = await chatWithAlfa({
        messages: nextMessages
          .filter((message) => message.id !== "welcome")
          .slice(-12)
          .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
      });
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: result.message,
        },
      ]);
    } catch {
      setError("Alfa AI could not reply just now. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <aside className="fixed bottom-5 right-5 z-50 no-print sm:bottom-7 sm:right-7" aria-label="Alfa AI assistant">
      {open ? (
        <section className="mb-3 flex h-[min(620px,calc(100vh-8rem))] w-[calc(100vw-2.5rem)] max-w-[390px] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border/70 bg-sage-soft/55 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Alfa AI</h2>
                <p className="text-xs text-muted-foreground">Your teaching co-planner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Close Alfa AI"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-cream text-foreground"
                }`}
              >
                {message.content}
              </div>
            ))}
            {sending ? (
              <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Alfa AI is thinking…
              </div>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          {messages.length === 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-border/70 px-4 py-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="border-t border-border/70 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-primary/50">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Alfa AI…"
                rows={1}
                maxLength={2000}
                className="max-h-24 min-h-6 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Message Alfa AI"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
        aria-expanded={open}
      >
        <Bot className="size-4" strokeWidth={2} />
        Ask Alfa AI
      </button>
    </aside>
  );
}
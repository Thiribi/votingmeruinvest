import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Loader2, Send } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import {
  conversationsApi,
  ApiError,
  type Conversation,
  type ConversationMessage,
} from "@/lib/api";

export const Route = createFileRoute("/conversations/$id")({
  component: ConversationThread,
});

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeLabel(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConversationThread() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    conversationsApi
      .get(id)
      .then((c) => {
        setConversation(c);
        setMessages(c.messages ?? []);
      })
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    setError(null);
    if (!body.trim()) return;
    setSending(true);
    try {
      const msg = await conversationsApi.postMessage(id, body.trim());
      setMessages((m) => [...m, msg]);
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppLayout>
      <Link
        to="/conversations"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All conversations
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
        </div>
      ) : !conversation ? (
        <div className="fb-card p-6 text-sm text-muted-foreground">Conversation not found.</div>
      ) : (
        <div className="fb-card flex flex-col overflow-hidden">
          <header className="border-b border-border p-4">
            <h1 className="font-semibold text-foreground">{conversation.title}</h1>
            <p className="text-xs text-muted-foreground">
              Started by {conversation.starter ?? "a fan"}
            </p>
          </header>

          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m) => {
              const mine = user && m.user_id === user.id;
              return (
                <div key={String(m.id)} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      m.author_is_admin ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                    }`}
                  >
                    {m.author_is_admin ? <BadgeCheck className="h-4 w-4" /> : initials(m.author)}
                  </div>
                  <div className={`max-w-[75%] ${mine ? "items-end text-right" : ""}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-foreground"
                      }`}
                    >
                      {m.body}
                    </div>
                    <p className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                      {m.author_is_admin ? "Replied by Admin" : (m.author ?? "Fan")} · {timeLabel(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3">
            {user ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  className="fb-input flex-1"
                  placeholder="Write a message…"
                  value={body}
                  maxLength={2000}
                  onChange={(e) => setBody(e.target.value)}
                />
                <button type="submit" className="btn-accent" disabled={sending || !body.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  search={{ redirect: `/conversations/${id}` }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>{" "}
                to join the conversation.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

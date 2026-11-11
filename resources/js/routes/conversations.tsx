import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Loader2, Plus, Send } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { conversationsApi, ApiError, type Conversation } from "@/lib/api";

export const Route = createFileRoute("/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — FansBench" },
      { name: "description", content: "Start a conversation and chat with the FansBench community." },
    ],
  }),
  component: ConversationsPage,
});

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ConversationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    conversationsApi
      .list()
      .then((r) => setConversations(r.data))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  function requestSend() {
    setError(null);
    if (body.trim().length < 1) return setError("Say something to kick it off.");
    setConfirmOpen(true);
  }

  async function confirmSend() {
    setPosting(true);
    try {
      const created = await conversationsApi.create({ body: body.trim() });
      setConfirmOpen(false);
      navigate({ to: "/conversations/$id", params: { id: String(created.id) } });
    } catch (err) {
      setConfirmOpen(false);
      setError(err instanceof ApiError ? err.message : "Couldn't start the conversation.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            Start a conversation and chat with the community.
          </p>
        </div>
        {user ? (
          <button className="btn-accent" onClick={() => setShowComposer((v) => !v)}>
            <Plus className="h-4 w-4" /> Start a conversation
          </button>
        ) : (
          <Link to="/login" className="btn-accent">
            Sign in to start
          </Link>
        )}
      </div>

      {user && showComposer && (
        <div className="fb-card mb-4 p-5">
          <textarea
            className="fb-input min-h-[90px] resize-y"
            placeholder="Say whats on your heart fan!"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowComposer(false)}>
              Cancel
            </button>
            <button className="btn-accent" onClick={requestSend} disabled={posting}>
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => !posting && setConfirmOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Post this conversation?</DialogTitle>
            <DialogDescription>
              Everyone on FansBench will be able to see and reply to it once it's sent.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground">
            {body}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setConfirmOpen(false)} disabled={posting}>
              Cancel
            </button>
            <button className="btn-accent" onClick={confirmSend} disabled={posting}>
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Yes, send it
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
        </div>
      ) : conversations.length === 0 ? (
        <div className="fb-card p-6 text-sm text-muted-foreground">
          No conversations yet — be the first to start one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((c) => (
            <Link
              key={String(c.id)}
              to="/conversations/$id"
              params={{ id: String(c.id) }}
              className="fb-card fb-card-hover flex items-center gap-4 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{c.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Started by {c.starter ?? "a fan"} · {c.messages_count} message
                  {c.messages_count === 1 ? "" : "s"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(c.last_message_at ?? c.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

import { useState } from "react";
import { Loader2, MessageSquare, CheckCircle2 } from "lucide-react";

/**
 * Optional post-vote feedback. Voters pick a preset (defined by the campaign) or type their
 * own; the backend stores it on the vote, which already carries their location (geo-tagged).
 */
export function FeedbackPrompt({
  options,
  onSubmit,
}: {
  options: string[];
  onSubmit: (feedback: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const value = (custom.trim() || selected || "").trim();

  if (done) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Thanks for your feedback!
      </p>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border bg-surface-muted/60 p-3 text-left">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-primary" /> Leave feedback (optional)
      </p>
      {options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setSelected((s) => (s === opt ? null : opt));
                setCustom("");
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected === opt
                  ? "border-primary bg-secondary text-primary"
                  : "border-border text-foreground hover:bg-surface-muted"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="fb-input mt-2 min-h-[60px] resize-y text-sm"
        placeholder="Or write your own…"
        value={custom}
        maxLength={500}
        onChange={(e) => {
          setCustom(e.target.value);
          if (e.target.value) setSelected(null);
        }}
      />
      <button
        type="button"
        disabled={busy || !value}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(value);
            setDone(true);
          } finally {
            setBusy(false);
          }
        }}
        className="btn-outline mt-2 w-full text-sm disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send feedback"}
      </button>
    </div>
  );
}

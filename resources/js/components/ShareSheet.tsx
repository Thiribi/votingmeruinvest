import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toJpeg } from "html-to-image";
import { Check, Copy, Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import { StoryCard, type StoryCardData } from "./StoryCard";

const MENU_WIDTH = 240;

export function ShareSheet({
  url,
  text,
  story,
  className = "btn-ghost",
}: {
  url: string;
  text: string;
  story: StoryCardData;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  // Anchor the menu to the button in viewport coordinates so it renders in a body-level
  // portal, escaping any `overflow-hidden` ancestor (e.g. feed cards) that would clip it.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setMenuPos({ top: rect.bottom + 8, left });
  }, [open]);

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Clipboard API is unavailable on some in-app/webview browsers even over HTTPS —
        // this legacy fallback still works there.
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // best effort — the link is still visible/shareable via the other options
    }
  }

  const fileName = `fansbench-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}.jpg`;

  async function renderCardFile(): Promise<File | null> {
    if (!cardRef.current) return null;
    const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, pixelRatio: 1, width: 1080, height: 1920 });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], fileName, { type: "image/jpeg" });
  }

  async function nativeShare() {
    try {
      const file = await renderCardFile();
      // Share the actual leaderboard image where the platform supports file sharing — most
      // receiving apps (WhatsApp, Instagram, Messages) drop a separate `url` field once files
      // are attached, so the link is folded into `text` too as a safety net.
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: text, text: `${text}\n${url}`, files: [file] });
      } else {
        await navigator.share({ title: text, url });
      }
    } catch {
      // user cancelled, or sharing failed — nothing to recover, the menu options still work
    }
    setOpen(false);
  }

  async function downloadImage() {
    setDownloading(true);
    try {
      const file = await renderCardFile();
      if (!file) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // ignore — best effort
    } finally {
      setDownloading(false);
      setOpen(false);
    }
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted";

  return (
    <div className="inline-block">
      <button ref={buttonRef} type="button" className={className} onClick={() => setOpen((v) => !v)}>
        <Share2 className="h-4 w-4" /> Share
      </button>

      {open &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[61] w-60 rounded-2xl border border-border bg-white p-2 shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button type="button" onClick={copyLink} className={itemClass}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                {copied ? "Link copied!" : "Copy link"}
              </button>
              {/* Real anchor navigations, not window.open() — far more reliably honoured by
                  popup blockers and in-app browsers (Instagram/TikTok/Facebook webviews)
                  than a script-triggered popup, which several fans reported as a dead click. */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                <MessageCircle className="h-4 w-4" /> Share via WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                <span className="flex h-4 w-4 items-center justify-center text-xs font-bold">𝕏</span>
                Share on X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                <span className="flex h-4 w-4 items-center justify-center text-sm font-bold">f</span>
                Share on Facebook
              </a>
              {canNativeShare && (
                <button type="button" onClick={nativeShare} className={itemClass}>
                  <Share2 className="h-4 w-4" /> More options…
                </button>
              )}
              <button type="button" onClick={downloadImage} disabled={downloading} className={itemClass}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download image for stories
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* Rendered off-screen so html-to-image can capture it at full resolution. */}
      <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden>
        <StoryCard ref={cardRef} data={story} />
      </div>
    </div>
  );
}

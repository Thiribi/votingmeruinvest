import { useRef, useState, type ReactNode } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadsApi, ApiError } from "@/lib/api";

/**
 * Admin picture picker used for category/subcategory/nominee images: shows a circular preview,
 * uploads the picked file immediately, and reports back the resulting public URL — the caller
 * just stores that URL in its form state exactly as it would have with a pasted link.
 */
export function ImageUploadField({
  label = "Photo",
  value,
  onChange,
  fallbackIcon,
  helpText,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  fallbackIcon: ReactNode;
  helpText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadsApi.image(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 shrink-0 border border-border">
          <AvatarImage src={value ?? undefined} alt={label} />
          <AvatarFallback className="bg-secondary text-primary">{fallbackIcon}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              className="btn-ghost text-destructive"
              onClick={() => onChange(null)}
            >
              <X className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        helpText && <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

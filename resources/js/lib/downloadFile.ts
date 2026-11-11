import { API_URL, getAuthToken } from "@/lib/api";

/**
 * Fetches a file with the bearer token attached and saves it via the browser — a plain
 * `<a href>` can't carry the Authorization header these admin export endpoints need.
 */
export async function downloadAuthedFile(
  path: string,
  params: Record<string, string | undefined>,
  fallbackName: string,
): Promise<void> {
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const token = getAuthToken();
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

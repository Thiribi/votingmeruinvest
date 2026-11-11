/**
 * FansBench API client — talks to a Laravel backend (Sanctum-compatible).
 *
 * Configure via env:
 *   VITE_API_URL       e.g. https://api.fansbench.com/api
 *   VITE_API_WEB_URL   e.g. https://api.fansbench.com  (for Sanctum CSRF cookie)
 *
 * All resource modules import `apiFetch` from here.
 */

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "/api";

export const API_WEB_URL =
  (import.meta.env.VITE_API_WEB_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

const TOKEN_KEY = "fb.auth.token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    if (data && typeof data === "object" && "errors" in data) {
      this.errors = (data as { errors: Record<string, string[]> }).errors;
    }
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Sanctum: hit /sanctum/csrf-cookie before mutating requests when using cookies. */
export async function ensureCsrf(): Promise<void> {
  if (!API_WEB_URL) return;
  if (readCookie("XSRF-TOKEN")) return;
  await fetch(`${API_WEB_URL}/sanctum/csrf-cookie`, { credentials: "include" });
}

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Use Sanctum session cookie auth instead of bearer token. */
  useCookies?: boolean;
  /** Abort signal. */
  signal?: AbortSignal;
};

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const url = new URL(
    path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  if (opts.useCookies) {
    await ensureCsrf();
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
  } else {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    credentials: opts.useCookies ? "include" : "same-origin",
    body:
      opts.body === undefined
        ? undefined
        : isForm
          ? (opts.body as FormData)
          : JSON.stringify(opts.body),
    signal: opts.signal,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: { first?: string; last?: string; prev?: string; next?: string };
};

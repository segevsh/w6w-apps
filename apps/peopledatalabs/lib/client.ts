import type { HookContext } from "@w6w/types";

/** Production host. Every path starts `/v5/`. */
export const API_URL = "https://api.peopledatalabs.com";
/** Free sandbox host (fixed 5 calls/min, no credits) — same paths, a small fixed dataset. */
export const SANDBOX_URL = "https://sandbox.api.peopledatalabs.com";

/** Drop `undefined`, `null` and empty-string values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/** Copy the named keys from the action input, skipping unset values. */
export function pick(
  input: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  return compact(Object.fromEntries(keys.map((k) => [k, input[k]])));
}

/** A JSON value either parsed or as the text a form field produces; unparseable text throws. */
export function jsonValue(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export type Query = Record<string, unknown>;

/** Build `?a=1&b=2`: unset and empty values and `false` flags are skipped (PDL flags default to false). */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * One human line from a PDL error body `{ status, error: { type, message } }`. The docs say
 * `error.type` is a string; the live API answers an ARRAY (`["authentication_error"]`), so both
 * are handled.
 */
export function errorText(body: unknown, raw = ""): string {
  const b = body as { error?: unknown; message?: unknown } | null;
  if (b && typeof b === "object") {
    const e = b.error;
    if (e && typeof e === "object") {
      const { type, message } = e as { type?: unknown; message?: unknown };
      const t = Array.isArray(type) ? type.join(", ") : typeof type === "string" ? type : "";
      const parts = [t, typeof message === "string" ? message : ""].filter(Boolean);
      if (parts.length > 0) return parts.join(": ");
    }
    if (typeof e === "string") return e;
    if (typeof b.message === "string") return b.message;
  }
  return raw.trim().slice(0, 200);
}

/** The `error.type` values of a PDL error body, always as an array. */
export function errorTypes(body: unknown): string[] {
  const type = (body as { error?: { type?: unknown } } | null)?.error?.type;
  return Array.isArray(type) ? type.map(String) : typeof type === "string" ? [type] : [];
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Use the free sandbox host instead of production. */
  sandbox?: boolean;
  /**
   * PDL answers `404 not_found` when nothing matched. That is a normal outcome, not a failure:
   * return `{ found: false, status: 404, error, ...fallback }` instead of throwing.
   */
  notFound?: Record<string, unknown>;
}

/**
 * Thin client over `https://api.peopledatalabs.com/v5`. Credentials are never handled here: the
 * runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps `X-Api-Key`.
 */
export class PdlClient {
  constructor(private readonly ctx: HookContext) {}

  /** Parsed JSON body of a 200; `found: false` result on a 404 when `notFound` is given. */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const base = options.sandbox ? SANDBOX_URL : API_URL;
    const url = `${base}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (res.status === 404 && options.notFound) {
      const err = (parsed as { error?: unknown } | null)?.error;
      return { ...options.notFound, found: false, status: 404, error: err ?? null } as T;
    }
    if (!res.ok) {
      throw new Error(
        `People Data Labs ${method} ${path} failed: HTTP ${res.status} — ${
          errorText(parsed, text)
        }`,
      );
    }
    if (Array.isArray(parsed)) return parsed as T;
    return { found: true, ...((parsed ?? {}) as Record<string, unknown>) } as T;
  }
}

import type { HookContext } from "@w6w/types";

/** `servers[0].url` from Findymail's OpenAPI document. Every path starts `/api/`. */
export const API_URL = "https://app.findymail.com";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** A comma-separated form value (or a real array) as a cleaned string list; empty is `undefined`. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Like `strList` but every entry becomes an integer; a non-integer entry throws. */
export function intList(value: unknown, label: string): number[] | undefined {
  const items = strList(value);
  if (!items) return undefined;
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n)) throw new Error(`${label} must be whole numbers, got "${s}".`);
    return n;
  });
}

/** A JSON value either parsed or as the text a form field produces; unparseable text passes through. */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Findymail errors come in three shapes: `{ error: "Not enough credits" }` (402/423),
 * `{ message: "Unauthenticated." }` (401/403/404/429) and Laravel validation
 * `{ message, errors: { field: [..] } }` (422).
 */
export interface FindymailErrorBody {
  error?: string;
  message?: string;
  errors?: Record<string, string[] | string>;
}

/** One human line from a parsed error body. */
export function errorText(body: unknown, raw = ""): string {
  const b = body as FindymailErrorBody | null;
  if (b && typeof b === "object") {
    const parts: string[] = [];
    if (typeof b.error === "string") parts.push(b.error);
    if (typeof b.message === "string") parts.push(b.message);
    if (b.errors && typeof b.errors === "object") {
      for (const [field, msgs] of Object.entries(b.errors)) {
        parts.push(`${field}: ${Array.isArray(msgs) ? msgs.join(" ") : String(msgs)}`);
      }
    }
    if (parts.length > 0) return parts.join(" — ");
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/**
 * Thin client over `https://app.findymail.com`. Credentials are never handled here: the runtime
 * routes every `ctx.fetch` through the Auth `sign` hook, which stamps `Authorization: Bearer`.
 * `accept: application/json` is always sent — it is a Laravel app and answers a non-JSON client
 * with a redirect or an HTML page instead of the JSON error envelope.
 */
export class FindymailClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_URL}${path}${buildQuery(options.query)}`;
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

    if (!res.ok) {
      throw new Error(
        `Findymail ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

import type { HookContext } from "@w6w/types";

/**
 * Mixmax REST API client.
 *
 * Verified on 2026-10-06 against developer.mixmax.com (a ReadMe site whose per-page OpenAPI
 * fragments were merged and read) and unauthenticated probes of `api.mixmax.com`.
 *
 * - Base `https://api.mixmax.com/v1`; the token goes in the `X-API-Token` header (`auth/api-token.ts`).
 * - Lists answer `{results, next, hasNext, previous}` and page with `limit` + `next`. The exception
 *   is `GET /sequences/{id}/recipients`, which answers a bare array and pages with `limit`+`offset`.
 * - Errors are `{message, link, documentation}` (`401 {"message":"Invalid API token provided"}`).
 * - Limit: 120 requests per 60 seconds per IP and user; a 429 carries `Retry-After`.
 * - Some answers are 204 with no body (unsubscribes); an empty body is a result, not a failure.
 */
export const API_BASE = "https://api.mixmax.com/v1";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

export type Query = Record<
  string,
  string | number | boolean | undefined | null | Array<string | number>
>;

/** Build `?a=1&b=2`; arrays repeat the key. Unset, null and empty values are skipped. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) { for (const v of value) params.append(key, String(v)); }
    else params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const out = Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  return Object.keys(out).length > 0 ? out : undefined;
}

/** A list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** A JSON value either parsed or as JSON text; unparseable text passes through for Mixmax to refuse. */
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

/** `[{email}]` from comma-separated addresses (Mixmax's `to`/`cc`/`bcc` are arrays of `{email, name?}`). */
export function recipients(value: unknown): Array<{ email: string }> | undefined {
  return strList(value)?.map((email) => ({ email }));
}

/**
 * Sequence recipients: `[{email, variables?, scheduledAt?}]`. Mixmax requires each recipient's
 * `variables` to carry `email` too, so it is filled in when absent. Accepts a JSON array, an array,
 * or comma-separated emails.
 */
export function sequenceRecipients(value: unknown): unknown {
  const parsed = jsonValue(value);
  const list = Array.isArray(parsed) ? parsed : strList(parsed);
  if (!list) return parsed;
  return list.map((item) => {
    const r = typeof item === "string" ? { email: item } : { ...(item as Record<string, unknown>) };
    const email = (r as { email?: unknown }).email;
    if (typeof email !== "string") return r;
    const variables = (r as { variables?: Record<string, unknown> }).variables ?? {};
    return { ...r, variables: { email, ...variables } };
  });
}

/** `scheduledAt`: `false` keeps recipients in draft, digits are a ms timestamp, else pass through. */
export function scheduledAt(
  value: string | number | undefined,
): string | number | false | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && value.trim().toLowerCase() === "false") return false;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return value;
}

/** The array under `results`, or `[]`. */
export function resultsOf(body: unknown): unknown[] {
  const r = (body as { results?: unknown } | null)?.results;
  return Array.isArray(r) ? r : [];
}

/** A paged list: results plus the `next` cursor and `hasNext`. */
export function page(body: unknown) {
  const b = (body ?? {}) as { next?: string; hasNext?: boolean };
  return { results: resultsOf(body), next: b.next, hasNext: b.hasNext === true };
}

/** One human line from a parsed error body: Mixmax's `{"message": "…"}`. */
export function errorText(body: unknown, raw = ""): string {
  const m = (body as { message?: unknown } | null)?.message;
  return typeof m === "string" && m ? m : raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class MixmaxClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (`{}` for an empty one, e.g. a 204). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(options.query)}`, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }
    if (!res.ok) {
      throw new Error(
        `Mixmax ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 ? " (limit is 120 requests per 60 seconds)" : ""
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

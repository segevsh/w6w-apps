import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Ringover public API client.
 *
 * Verified on 2026-10-06 against the OpenAPI 3.1.1 document at
 * `developer.ringover.com/web/openapi_public.yml` (606 KB) and live, unauthenticated probes of
 * both hosts.
 *
 * ## Two regions, one contract
 *
 * `servers` lists `https://public-api.ringover.com/v2` (Europe) and
 * `https://public-api-us.ringover.com/v2` (United States). Paths are identical on both. Ringover
 * offers no way to discover a team's region from a key, so the connection records it
 * (`auth/api-key.ts` stores it through `afterConnect`) and {@link regionFrom} reads it back off
 * `ctx.connection.display`.
 *
 * ## Auth, errors, empties
 *
 * The key travels bare in `Authorization` (no `Bearer`: `Authorization: Bearer abc` is answered
 * "Missing API key"). Errors are `{"error": "<text>"}`. Many list endpoints answer **204 with no
 * body** when nothing matches, so an empty body is a result, not a failure. Rate limit: 2
 * requests per second per key (429).
 *
 * Phone numbers are integers in E.164 without the `+` (`33612345678`); {@link digits} normalises
 * what a form field produces.
 */

export const API_URLS = {
  eu: "https://public-api.ringover.com/v2",
  us: "https://public-api-us.ringover.com/v2",
} as const;

export type Region = keyof typeof API_URLS;

/** Read the region `afterConnect` recorded. Never the raw credential. */
export function regionFrom(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "us" ? "us" : "eu";
}

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Phone number as Ringover writes it: E.164 digits, no `+`, spaces or punctuation. */
export function digits(value: string | number): string {
  return String(value).replace(/\D/g, "");
}

/** {@link digits} as the integer the JSON bodies take (E.164 fits a double exactly). */
export function digitsInt(value: string | number): number {
  return Number(digits(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** {@link strList} for ids Ringover types as integers. Non-numeric entries are dropped. */
export function intList(value: unknown): number[] | undefined {
  const items = strList(value)?.map(Number).filter((n) => Number.isFinite(n));
  return items && items.length > 0 ? items : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so Ringover, not this app, rejects it.
 */
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

/** Contact phone numbers: `[{number, type}]`, with `number` coerced to the integer Ringover wants. */
export function contactNumbers(value: unknown): unknown {
  const parsed = jsonValue(value);
  if (!Array.isArray(parsed)) return parsed;
  return parsed.map((n) => {
    if (n && typeof n === "object" && "number" in n) {
      const { number, ...rest } = n as { number: string | number };
      return { ...rest, number: digitsInt(number) };
    }
    return n;
  });
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
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** One human line from a parsed error body: Ringover's `{"error": "…"}`. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as { error?: unknown; message?: unknown } | null;
  if (typeof e?.error === "string" && e.error) return e.error;
  if (typeof e?.message === "string" && e.message) return e.message;
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/** The array under `key` of a list response; a 204 (empty body) is an empty list. */
export function listOf<T = Record<string, unknown>>(body: unknown, key: string): T[] {
  const value = (body as Record<string, unknown> | null)?.[key];
  return Array.isArray(value) ? value as T[] : [];
}

/** A numeric field of a response, or `fallback` when absent. */
export function numberOf(body: unknown, key: string, fallback = 0): number {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === "number" ? value : fallback;
}

export class RingoverClient {
  readonly base: string;

  constructor(private readonly ctx: HookContext) {
    this.base = API_URLS[regionFrom(ctx.connection)];
  }

  /** Issue a request and return the parsed JSON body (`{}` for an empty one, e.g. a 204). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.base}${path}${buildQuery(options.query)}`;
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
        `Ringover ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 ? " (limit is 2 requests per second per key)" : ""
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

/**
 * Shape a `GET/POST /calls` response: the log entries under `calls`, the page and overall counts,
 * and `lastId` — the oldest `cdr_id` on the page, which is the value to pass as `last_id_returned`
 * to fetch the next (older) page. A 204 (no calls) is an empty page.
 */
export function callsResult(body: unknown) {
  const calls = listOf<{ cdr_id?: number }>(body, "call_list");
  const lastId = calls.length > 0 ? calls[calls.length - 1].cdr_id : undefined;
  return {
    calls,
    count: numberOf(body, "call_list_count"),
    total: numberOf(body, "total_call_count"),
    totalMissed: numberOf(body, "total_missed_call_count"),
    ...(typeof lastId === "number" ? { lastId } : {}),
  };
}

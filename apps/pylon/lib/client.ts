import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Pylon REST API client.
 *
 * Verified on 2026-10-06 against the OpenAPI 3.0.3 document embedded in each page of
 * `docs.usepylon.com/pylon-docs/developer/api/api-reference/` (`info.version` 1.0.0, no standalone
 * openapi.json) and live probes of both hosts.
 *
 * ## Two regions, one contract
 *
 * `servers` lists `https://api.usepylon.com` (US) and `https://api.eu.usepylon.com` (EU). Paths are
 * bare (no version segment) and identical on both. Pylon offers no way to discover a tenant's
 * region from a token, so the connection records it (`auth/api-token.ts` stores it through
 * `afterConnect`) and {@link regionFrom} reads it back off `ctx.connection.display`.
 *
 * ## Envelope
 *
 * Success: `{ data, pagination?: { cursor, has_next_page }, request_id }`. Failure:
 * `{ errors: [one message], request_id, code?, exists_id? }`. `code` is the only stable part —
 * messages are reworded and localised — so errors are reported as `message (code)` and the app
 * never branches on the message text.
 */

export const API_URLS = {
  us: "https://api.usepylon.com",
  eu: "https://api.eu.usepylon.com",
} as const;

export type Region = keyof typeof API_URLS;

/** Read the region `afterConnect` recorded. Never the raw credential. */
export function regionFrom(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

/** Percent-encode one path segment (issue numbers, ids and external ids are caller strings). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so Pylon, not this app, rejects it.
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

/**
 * Pylon's `custom_fields` is an array of `{ slug, value }` (single-valued) or `{ slug, values }`
 * (multi-valued). This also takes the friendlier `{ slug: value }` object map and converts it:
 * an array value becomes `values`, anything else becomes `value` (stringified, as Pylon types it).
 */
export function customFields(input: unknown): unknown {
  const parsed = jsonValue(input);
  if (parsed === undefined || parsed === null) return undefined;
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).map(([slug, v]) =>
      Array.isArray(v) ? { slug, values: v.map(String) } : { slug, value: String(v) }
    );
  }
  return parsed;
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

/** Drop `undefined` values so an unset form field is never sent. `""` is kept: it clears a field. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Pylon's error envelope. */
export interface PylonErrorBody {
  errors?: string[];
  request_id?: string;
  code?: string;
  exists_id?: string;
}

/** One human line from a parsed error body: `message (code)`. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as PylonErrorBody | null;
  const message = Array.isArray(e?.errors) ? e!.errors[0] : undefined;
  if (message || e?.code) {
    const base = `${message ?? ""}${e?.code ? ` (${e.code})` : ""}`.trim();
    return e?.exists_id ? `${base} [existing id ${e.exists_id}]` : base;
  }
  return raw.trim().slice(0, 200);
}

export interface Page<T> {
  data?: T[];
  pagination?: { cursor?: string; has_next_page?: boolean };
  request_id?: string;
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class PylonClient {
  readonly base: string;

  constructor(private readonly ctx: HookContext) {
    this.base = API_URLS[regionFrom(ctx.connection)];
  }

  /** Issue a request and return the parsed JSON body (`{}` for an empty one). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
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
      const retry = res.headers.get("x-retry-after");
      throw new Error(
        `Pylon ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 && retry ? ` (retry after ${retry}s)` : ""
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }

  /** A single-record call: returns the unwrapped `data` object. */
  async one<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const body = await this.request<{ data?: T }>(method, path, options);
    return (body.data ?? {}) as T;
  }

  /** A list call: returns the records plus `hasNextPage` and, when more remain, `nextCursor`. */
  async list<T = Record<string, unknown>>(
    method: "GET" | "POST",
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; hasNextPage: boolean; nextCursor?: string }> {
    const body = await this.request<Page<T>>(method, path, options);
    const hasNextPage = body.pagination?.has_next_page === true;
    const cursor = body.pagination?.cursor;
    return {
      items: body.data ?? [],
      hasNextPage,
      ...(hasNextPage && cursor ? { nextCursor: cursor } : {}),
    };
  }
}

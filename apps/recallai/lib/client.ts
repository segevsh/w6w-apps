import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Recall.ai REST API client.
 *
 * Verified on 2026-10-06 against the per-endpoint OpenAPI 3.0.3 documents embedded in each page of
 * `docs.recall.ai/reference/*.md` (the index is `docs.recall.ai/llms.txt`) and live unauthenticated
 * probes of the US East host.
 *
 * ## Regions
 *
 * Recall runs four completely separate deployments (`docs.recall.ai/docs/regions`): US East, US
 * West, EU (Frankfurt) and Asia (Tokyo). Credentials and every resource are region-local, and a
 * key used against another region's host is refused with `authentication_failed`. The region is a
 * connection field and `afterConnect` records it so {@link regionFrom} can read it back off
 * `ctx.connection.display`. `api.recall.ai` is documented as an alias of US East; it is NOT used,
 * so the allowlist holds only the four canonical hosts.
 *
 * ## Shapes
 *
 * - Paths are `/api/v1/...` (bots, recordings, transcripts, usage) and `/api/v2/...` (calendars).
 * - Lists are `{ next, previous, results }`. `next` is a full URL whose `cursor` (or, for bots,
 *   `page`) query value is the next page's token.
 * - Errors are `{ code, detail }` (`not_authenticated`, `authentication_failed`, ...); a 400 on a
 *   body is a DRF field map like `{ "meeting_url": ["..."] }`.
 * - A GET with ANY body (even null) is blocked by Recall's WAF with a 403 `request_blocked`, so a
 *   body is only ever attached to a write.
 * - POST/PATCH accept an `Idempotency-Key` header, honoured for one hour.
 */

export const API_URLS = {
  "us-east-1": "https://us-east-1.recall.ai",
  "us-west-2": "https://us-west-2.recall.ai",
  "eu-central-1": "https://eu-central-1.recall.ai",
  "ap-northeast-1": "https://ap-northeast-1.recall.ai",
} as const;

export type Region = keyof typeof API_URLS;

export const DEFAULT_REGION: Region = "us-west-2";

export function isRegion(value: unknown): value is Region {
  return typeof value === "string" && Object.hasOwn(API_URLS, value);
}

/** Read the region `afterConnect` recorded. Never the raw credential. */
export function regionFrom(connection: RedactedConnection | undefined): Region {
  const region = (connection?.display as { region?: unknown } | undefined)?.region;
  return isRegion(region) ? region : DEFAULT_REGION;
}

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so Recall, not this app, rejects it.
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

/** A JSON value that must be an object; anything else is dropped (and left for Recall to judge). */
export function jsonObject(value: unknown): Record<string, unknown> | undefined {
  const parsed = jsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : undefined;
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
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

/** Recall's error body: `{ code, detail }`, or a DRF field-error map on a 400. */
export function errorText(body: unknown, raw = ""): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const e = body as { code?: unknown; detail?: unknown };
    if (typeof e.detail === "string" || typeof e.code === "string") {
      const detail = typeof e.detail === "string" ? e.detail : "";
      return `${detail}${typeof e.code === "string" ? ` (${e.code})` : ""}`.trim();
    }
    return JSON.stringify(body).slice(0, 300);
  }
  return raw.trim().slice(0, 200);
}

/** The value of one query parameter of a pagination `next` URL, if any. */
export function nextToken(next: unknown, param: "cursor" | "page"): string | undefined {
  if (typeof next !== "string" || next === "") return undefined;
  try {
    return new URL(next).searchParams.get(param) ?? undefined;
  } catch {
    return undefined;
  }
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  idempotent?: boolean;
}

export class RecallClient {
  readonly base: string;
  private readonly idempotencyKey?: string;

  constructor(private readonly ctx: HookContext) {
    this.base = API_URLS[regionFrom(ctx.connection)];
    this.idempotencyKey = ctx.invocation?.invocationId;
  }

  /** Issue a request and return the parsed JSON body (`{}` for an empty one, e.g. a 204). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.base}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined && method !== "GET") {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    if (options.idempotent && this.idempotencyKey) {
      headers["idempotency-key"] = this.idempotencyKey;
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
      const retry = res.headers.get("retry-after");
      throw new Error(
        `Recall ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          (res.status === 429 || res.status === 507) && retry ? ` (retry after ${retry}s)` : ""
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }

  /** A list call: the records plus `nextCursor` (and `nextPage` for offset-paged bot lists). */
  async list<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; count?: number; nextCursor?: string; nextPage?: number }> {
    const body = await this.request<
      { results?: T[]; next?: string | null; count?: number }
    >("GET", path, options);
    const nextCursor = nextToken(body.next, "cursor");
    const page = nextToken(body.next, "page");
    return {
      items: body.results ?? [],
      ...(typeof body.count === "number" ? { count: body.count } : {}),
      ...(nextCursor ? { nextCursor } : {}),
      ...(page && Number.isFinite(Number(page)) ? { nextPage: Number(page) } : {}),
    };
  }
}

/** Recall's calendar objects echo the OAuth client secret and refresh token; never pass them on. */
export function redactCalendar(cal: Record<string, unknown>): Record<string, unknown> {
  const { oauth_refresh_token: _t, oauth_client_secret: _s, ...rest } = cal;
  return rest;
}

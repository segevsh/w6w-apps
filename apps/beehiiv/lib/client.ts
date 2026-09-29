import type { HookContext } from "@w6w/types";

/**
 * beehiiv API v2 REST client.
 *
 * Everything in this module was verified against beehiiv's own OpenAPI 3.0.1
 * document (`beehiiv - OpenAPI Specification.yaml`, 798 KB, `info.title`
 * `Beehiiv API`) — supplied directly by the vendor's docs export, not fetched
 * from a third-party directory — plus live probes against `api.beehiiv.com`
 * on 2026-09-29.
 *
 * ## One host, one prefix
 *
 * The document declares exactly one server, `https://api.beehiiv.com/v2`.
 * There is no regional host and no sandbox environment.
 *
 * ## One envelope, two pagination shapes
 *
 * Every success response wraps its payload as `{"data": …}`. A single-entity
 * read/write returns `data` as an object; a list endpoint returns `data` as an
 * array plus paging fields alongside it — but which paging fields depends on
 * the endpoint:
 *
 *  - **Offset pagination** (every list endpoint except subscriptions):
 *    `{data, page, limit, total_results, total_pages}`.
 *  - **Cursor pagination** (`GET /subscriptions` only, added after the
 *    offset form and layered on top of it): `{data, limit, page?,
 *    total_pages?, has_more, next_cursor}`. The vendor's own spec documents
 *    offset pagination on this one endpoint as **deprecated and capped at 100
 *    pages** — pass `cursor` (from a previous page's `next_cursor`) instead
 *    of `page` for a list that may run past that ceiling.
 *
 * ## Errors are a structured array, not a flat message
 *
 * Every failure is `{"status", "statusText", "errors": [{"message", "code"}]}`
 * with a matching 4xx/5xx HTTP status — confirmed live. `code` is a stable
 * machine token (`INVALID_API_KEY`, …) and is surfaced by
 * {@link formatBeehiivError} because the fix differs per code and a flattened
 * "HTTP 401" hides which one it was.
 *
 * **beehiiv does not distinguish "no key" from "wrong key".** Measured live: a
 * request with no `Authorization` header and one with a syntactically
 * plausible but fake bearer token both answer `401 INVALID_API_KEY` with the
 * identical message `"The api key is not valid"`. Apify and many other
 * vendors split these into two codes; beehiiv collapses them, so
 * `auth/api-key.ts`'s `test` hook cannot tell "the credential never reached
 * the request" from "the credential is wrong" — both are reported the same
 * way.
 *
 * ## Async post creation
 *
 * `POST /posts` returns `201` with a stable `id` before the post finishes
 * being built. Fetching it immediately can answer `202` (still building,
 * retry) or a `404` carrying `POST_CREATION_FAILED` (creation failed for
 * good — stop retrying). `posts-get.ts` and `posts-create.ts` document this;
 * this client does not paper over it with a hidden retry loop, because a
 * workflow step's own retry/backoff policy is the host's call, not this
 * app's.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.beehiiv.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The offset-paginated list envelope, used by every list endpoint but subscriptions. */
export interface OffsetListPage<T> {
  data: T[];
  page?: number;
  limit?: number;
  total_results?: number;
  total_pages?: number;
}

/** The cursor-paginated list envelope, `GET /subscriptions` only. See module docs. */
export interface CursorListPage<T> {
  data: T[];
  limit?: number;
  page?: number;
  total_pages?: number;
  has_more?: boolean;
  next_cursor?: string | null;
}

interface BeehiivErrorBody {
  status?: number;
  statusText?: string;
  errors?: Array<{ message?: string; code?: string }>;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact<T extends Record<string, QueryValue>>(obj: T): T {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as T;
}

/** Normalise a `multiselect`/comma-list param into an array of strings. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn beehiiv's error body into one actionable line.
 *
 * `code` is kept because it is the stable token the vendor's own error
 * catalogue is written against — `INVALID_API_KEY` and
 * `POST_CREATION_FAILED` are different problems with different fixes, and
 * both arrive as a bare 4xx without it. Multiple errors are joined; the
 * vendor's `errors` field is an array even though every observed response so
 * far carries exactly one.
 */
export function formatBeehiivError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: BeehiivErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as BeehiivErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors || errors.length === 0) {
    return `beehiiv ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const detail = errors
    .map((e) => [e.code, e.message].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("; ");
  return truncate(`beehiiv ${status} for ${method} ${path}: ${detail}`, 1000);
}

/**
 * A raw fetch that does NOT throw on a non-2xx status — used only by the Posts
 * actions, which must distinguish beehiiv's Send API states (`200`/`201` done,
 * `202` still building in the background, `404 POST_CREATION_FAILED` failed
 * for good) rather than collapsing every non-2xx into one error. Every other
 * action uses {@link BeehiivClient}, whose throw-on-`!ok` is the right default.
 */
export async function rawFetch(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<{ status: number; text: string; body: unknown }> {
  const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const res = await ctx.fetch(url.toString(), init);
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { status: res.status, text, body };
}

export class BeehiivClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": …}` in, `data` out. Every single-entity read/write. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** The full envelope, unwrapped for a list endpoint (offset pagination). */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<OffsetListPage<T>> {
    return await this.json<OffsetListPage<T>>(path, options);
  }

  /** The full envelope for the one cursor-paginated list endpoint (subscriptions). */
  async cursorList<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<CursorListPage<T>> {
    return await this.json<CursorListPage<T>>(path, options);
  }

  /** Parse the body without unwrapping. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer 204 with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // beehiiv's array-valued filters (`content_tags[]`, `slugs[]`, `authors[]`,
        // `expand[]`, ...) are documented and observed as REPEATED keys, not a
        // single comma-joined value — unlike Apify's comma-joined form.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBeehiivError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}

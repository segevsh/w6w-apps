import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Phrase Strings API v2 client.
 *
 * Verified 2026-10-06 against Phrase's own compiled OpenAPI document
 * (`github.com/phrase/openapi`, `doc/compiled.json`, `info.version` 2.0.0) and the
 * developer hub (`developers.phrase.com/en/api/strings/*`), plus live probes of both
 * data centres.
 *
 * ## Two fixed hosts, chosen by the connection
 *
 * The spec declares exactly two servers: `https://api.phrase.com/v2` (EU) and
 * `https://api.us.app.phrase.com/v2` (US). An access token is minted in one data
 * centre and is rejected by the other, so the region is a field on the connection.
 * `afterConnect` publishes it on the redacted connection `display`, and every Action
 * reads it from there — an Action never sees the credential. A connection with no
 * published region falls back to EU, Phrase's default.
 *
 * ## Responses
 *
 *  - Resources answer bare JSON (no `{"data": …}` envelope). Lists answer a bare array.
 *  - Pagination is `page` + `per_page` (default 25, max 100). Position is reported in a
 *    `Pagination` JSON header and as RFC 5988 `Link` headers; the body is the array alone,
 *    so {@link PhraseClient.list} lifts both into the action's output.
 *  - A 401 has an EMPTY `text/html` body — measured on both hosts — so there is no
 *    vendor error code to classify; the status is the only signal. Everything else
 *    (`400`, `404`, `422`) carries `{"message", "errors":[{resource, field, message}]}`.
 *  - Rate limit: 1000 requests / 5 minutes and 4 concurrent requests per user, with
 *    `X-Rate-Limit-{Limit,Remaining,Reset}` on every response and `X-Rate-Limit-Reason`
 *    on a 429.
 */

export const HOSTS = {
  eu: "https://api.phrase.com",
  us: "https://api.us.app.phrase.com",
} as const;

export type Region = keyof typeof HOSTS;

export const API_PREFIX = "/v2";

/** Phrase asks API clients to identify themselves; harmless where it is not enforced. */
export const USER_AGENT = "w6w-phrase-app/0.1";

/** Normalise a region value; anything that is not `us` is the EU default. */
export function regionOf(value: unknown): Region {
  return String(value ?? "eu").trim().toLowerCase() === "us" ? "us" : "eu";
}

/** Read the region off the redacted connection. */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return regionOf(display.region);
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON. */
  body?: Record<string, unknown>;
  /** Multipart body (uploads). The runtime sets the boundary header. */
  form?: FormData;
  accept?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Percent-encode one path segment (ids, tag/branch names). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

/** Accept a multiselect/csv param as a list or comma string; emit the comma string Phrase wants. */
export function csv(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Split a comma string (or pass a list through) for the few body fields Phrase types as arrays. */
export function toArray(v: string[] | string | undefined | null): string[] | undefined {
  const joined = csv(v);
  return joined === undefined ? undefined : joined.split(",");
}

/** Accept a `json` param as a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export interface PhrasePage<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount?: number;
  totalPages?: number;
  /** Absent on the last page. */
  nextPage?: number;
}

interface PhraseErrorBody {
  message?: string;
  errors?: Array<{ resource?: string; field?: string; message?: string }>;
}

/** Render a failure from the vendor body when there is one, from the status when not. */
export function formatPhraseError(
  status: number,
  body: PhraseErrorBody | null,
  res?: Response,
): string {
  const detail = body?.message
    ? ` ${body.message}${
      body.errors?.length
        ? ` (${
          body.errors.map((e) => [e.resource, e.field, e.message].filter(Boolean).join(" "))
            .join("; ")
        })`
        : ""
    }`
    : "";
  if (status === 401) {
    return "Phrase rejected the access token (401, empty body). Check the token and that the " +
      "connection's region matches the data centre it was created in.";
  }
  if (status === 403) {
    return `Phrase refused the request (403): the token may lack the scope, the user may lack ` +
      `permission, or the plan may not include the feature.${detail}`;
  }
  if (status === 429) {
    const reason = res?.headers.get("x-rate-limit-reason");
    const reset = res?.headers.get("x-rate-limit-reset");
    return `Phrase rate limit hit (429${reason ? ` ${reason}` : ""})${
      reset ? `, resets at unix ${reset}` : ""
    }. Limits: 1000 requests per 5 minutes, 4 concurrent.${detail}`;
  }
  return `Phrase returned HTTP ${status}.${detail}`;
}

function parsePagination(res: Response): Record<string, number | undefined> {
  const raw = res.headers.get("pagination");
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as Record<string, number | undefined>;
    return p ?? {};
  } catch {
    return {};
  }
}

/** The `page` value of the `rel="next"` Link, when the Pagination header is absent. */
function nextFromLink(res: Response): number | undefined {
  const link = res.headers.get("link");
  if (!link) return undefined;
  for (const part of link.split(",")) {
    if (!/rel="?next"?/.test(part)) continue;
    const m = part.match(/<([^>]+)>/);
    if (!m) continue;
    try {
      const n = Number(new URL(m[1]).searchParams.get("page"));
      if (Number.isFinite(n) && n > 0) return n;
    } catch { /* ignore a malformed link */ }
  }
  return undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential — the runtime routes
 * every request through the auth `sign` hook.
 */
export class PhraseClient {
  readonly region: Region;
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.region = regionFromConnection(ctx.connection);
    this.base = `${HOSTS[this.region]}${API_PREFIX}`;
  }

  url(path: string, query?: Record<string, QueryValue>): string {
    const u = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  /** Issue a request and return the raw Response, throwing a readable error on non-2xx. */
  async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const headers: Record<string, string> = {
      accept: options.accept ?? "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }
    const res = await this.ctx.fetch(this.url(path, options.query), init);
    if (res.ok) return res;
    const body = await res.json().catch(() => null) as PhraseErrorBody | null;
    this.ctx.log("warn", "phrase request failed", { status: res.status, path });
    throw new Error(formatPhraseError(res.status, body, res));
  }

  /** Parse a JSON response; a 204 / empty body yields `{ success: true }`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return { success: true } as T;
    return JSON.parse(text) as T;
  }

  /** A paginated GET: the array plus where it sits in the collection. */
  async list<T = unknown>(
    path: string,
    query: Record<string, QueryValue> & { page?: number; per_page?: number },
    request: Pick<RequestOptions, "method" | "body"> = {},
  ): Promise<PhrasePage<T>> {
    const res = await this.send(path, { query, ...request });
    const items = await res.json() as T[];
    const p = parsePagination(res);
    return {
      items,
      page: p.current_page ?? query.page ?? 1,
      perPage: p.current_per_page ?? query.per_page ?? 25,
      totalCount: p.total_count,
      totalPages: p.total_pages_count,
      nextPage: p.next_page ?? nextFromLink(res),
    };
  }

  /** A raw file/text body (locale downloads). */
  async text(path: string, options: RequestOptions = {}) {
    const res = await this.send(path, { accept: "*/*", ...options });
    return {
      content: await res.text(),
      contentType: res.headers.get("content-type") ?? "",
      etag: res.headers.get("etag") ?? undefined,
    };
  }
}

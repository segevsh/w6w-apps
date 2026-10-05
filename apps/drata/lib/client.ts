import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Drata Public API v2 client.
 *
 * Everything here was verified on 2026-10-05 against Drata's own OpenAPI document
 * (the `redocStoreStr` payload of `developers.drata.com/openapi/reference/v2/overview/`,
 * 145 paths, 574 schemas) plus live probes of `status.drata.com`. The old
 * `public-api.drata.com/public/openapi.json` answers 401 and is not the source.
 *
 * ## Three hosts, one prefix — region is part of the credential's meaning
 *
 * The document declares exactly three servers, and a key only works on the one
 * its account lives in:
 *
 *   - `https://public-api.drata.com/public/v2`      (North America)
 *   - `https://public-api.eu.drata.com/public/v2`   (Europe)
 *   - `https://public-api.apac.drata.com/public/v2` (Asia-Pacific)
 *
 * The region is a fixed, enumerated allowlist ({@link REGION_HOSTS}) — never a
 * free-text host — so a Connection cannot point this app at an arbitrary server.
 * It is stored on the Connection's display data by `afterConnect` (it is not a
 * secret) and read back here, because an Action never sees the credential.
 *
 * ## Response shapes
 *
 * Reads answer `{ data: [...], pagination: { cursor, totalCount? } }` for lists
 * and the bare object for a single record. Pagination is **cursor-based**: the
 * first request sends no `cursor`; a response whose `pagination.cursor` is
 * non-empty has another page. `totalCount` is only present when the request
 * sent `includeTotalCount=true`, and only on the first page.
 *
 * ## Errors
 *
 * `{ statusCode, message, code }` with the matching HTTP status. The documented
 * set is 400 (validation), 401 (invalid Authorization), 403 (the key lacks the
 * endpoint's permission), 412 (the key's owner has not accepted Drata's terms in
 * the web app) and 500. 412 is the one that costs people a day — see
 * {@link formatDrataError}.
 *
 * ## Rate limit
 *
 * 500 requests per minute **per IP address**, per the developer portal's overview.
 * No rate-limit header is documented, so there is nothing to read headroom from.
 */

export type DrataRegion = "us" | "eu" | "apac";

/** The only hosts this app will ever call. Keys are the Connection's `region` value. */
export const REGION_HOSTS: Record<DrataRegion, string> = {
  us: "https://public-api.drata.com",
  eu: "https://public-api.eu.drata.com",
  apac: "https://public-api.apac.drata.com",
};

export const API_PREFIX = "/public/v2";

export const REGION_OPTIONS = [
  { value: "us", label: "North America — public-api.drata.com (the default)" },
  { value: "eu", label: "Europe — public-api.eu.drata.com" },
  { value: "apac", label: "Asia-Pacific — public-api.apac.drata.com" },
];

/** Normalise a stored/entered region; anything outside the allowlist is `undefined`. */
export function parseRegion(value: unknown): DrataRegion | undefined {
  const key = String(value ?? "").trim().toLowerCase();
  return key in REGION_HOSTS ? key as DrataRegion : undefined;
}

/** Base URL (host + `/public/v2`) for a region; a missing region means North America. */
export function baseForRegion(region: unknown): string {
  const parsed = region === undefined || region === null || region === ""
    ? "us"
    : parseRegion(region);
  if (!parsed) {
    throw new Error(`Unknown Drata region "${String(region)}" — expected us, eu or apac`);
  }
  return `${REGION_HOSTS[parsed]}${API_PREFIX}`;
}

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialised as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Pre-built body (a hand-assembled multipart payload) and its content type. */
  rawBody?: { contentType: string; text: string };
}

interface DrataErrorBody {
  statusCode?: number;
  message?: string | string[];
  code?: number;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect` / comma-separated param into a clean list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as a parsed value or as the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Percent-encode one path segment so a pasted `/` cannot escape it. */
export const seg = (v: string | number): string => encodeURIComponent(String(v).trim());

/** The Connection's display data — what `afterConnect` published. */
export function displayOf(connection: RedactedConnection | undefined): { region?: string } {
  return (connection?.display ?? {}) as { region?: string };
}

/**
 * Turn a failed response into one message that names the status, Drata's own
 * message, and — for the statuses whose fix is not obvious — what to do.
 */
export function formatDrataError(status: number, body: DrataErrorBody | null, text = ""): string {
  const raw = body?.message;
  const message = Array.isArray(raw) ? raw.join("; ") : raw ?? text.slice(0, 300);
  const code = body?.code !== undefined ? ` code ${body.code}` : "";
  let hint = "";
  if (status === 401) {
    hint = " — the API key was rejected; check it, and check the region on the connection";
  } else if (status === 403) {
    hint = " — the API key lacks the permission this endpoint requires (set per key in Drata " +
      "under Settings > API Keys)";
  } else if (status === 412) {
    hint = " — the user who owns this API key has not accepted Drata's terms and conditions; " +
      "sign in to the Drata web app once as that user";
  }
  return `Drata API error (HTTP ${status}${code}): ${message || "no message"}${hint}`;
}

export class DrataClient {
  private readonly base: string;

  constructor(private readonly ctx: HookContext) {
    this.base = baseForRegion(displayOf(ctx.connection).region);
  }

  url(path: string, query?: Record<string, QueryValue>): string {
    const u = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) u.searchParams.append(key, String(item));
      } else {
        u.searchParams.set(key, String(value));
      }
    }
    return u.toString();
  }

  /** One request; returns the parsed JSON body (or `null` for an empty one). */
  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.rawBody) {
      headers["content-type"] = opts.rawBody.contentType;
      body = opts.rawBody.text;
    } else if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(this.url(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (!res.ok) throw new Error(formatDrataError(res.status, parsed as DrataErrorBody, text));
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  /**
   * A cursor-paginated list, flattened to `{ items, nextCursor, totalCount }`.
   * `nextCursor` is `null` when the last page was reached.
   */
  async list(path: string, query: Record<string, QueryValue>): Promise<DrataPage> {
    const res = await this.get<
      & { data?: unknown[]; pagination?: { cursor?: string | null; totalCount?: number } }
      & Record<
        string,
        unknown
      >
    >(path, query);
    const { data, pagination, ...rest } = res ?? {};
    return {
      items: Array.isArray(data) ? data : [],
      nextCursor: pagination?.cursor || null,
      totalCount: pagination?.totalCount ?? null,
      ...rest,
    };
  }
}

export interface DrataPage {
  items: unknown[];
  nextCursor: string | null;
  totalCount: number | null;
  [extra: string]: unknown;
}

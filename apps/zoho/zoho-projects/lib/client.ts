import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zoho Projects V3 API client.
 *
 * Verified 2026-10-06 against `https://projects.zoho.com/api-docs` (the V3 reference; the old
 * `/restapi/` pages are marked deprecated and are not used) plus unauthenticated probes of the
 * live API.
 *
 *  - Base: `https://projects.<tld>/api/v3` — host chosen per data centre (`lib/regions.ts`) and
 *    recorded on the Connection by `auth/oauth2.ts#afterConnect`. A few endpoints exist only
 *    under `/api/v3.1` (milestones use it here); the version is a per-call argument.
 *  - Portal-scoped: everything but `GET /portals` lives under `/portal/{portal_id}`.
 *  - Plain JSON bodies (`Content-Type: application/json`); long ids are sent as strings, since
 *    some exceed 2^53.
 *  - Pagination: `page` + `per_page` (1-200, default 100). List responses are
 *    `{ page_info: { page, per_page, has_next_page }, <collection>: [...] }`; a few documented
 *    samples show a bare array or an array-valued `page_info`, so both are tolerated.
 *  - Errors: `{ "error": { "status_code", "title", "error_type", "details": [{ "message" }] } }`
 *    where `title` is the vendor's stable code (`INVALID_OAUTHTOKEN`, `INVALID_TICKET`, ...).
 *  - Rate limit: 200 calls per API per 2 minutes, blocked 10 minutes beyond that.
 */

export const DEFAULT_API_HOST = "projects.zoho.com";

export type ApiVersion = "v3" | "v3.1";

/** The API host for this connection, as recorded by `afterConnect`. */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

export interface ProjectsError {
  title?: string;
  errorType?: string;
  message?: string;
}

/** Pull the vendor's `error` object out of a response body, if it has one. */
export function parseError(raw: string): ProjectsError | undefined {
  try {
    const e = (JSON.parse(raw) as {
      error?: {
        title?: string;
        error_type?: string;
        details?: Array<{ message?: string }>;
        message?: string;
      };
    })?.error;
    if (!e || typeof e !== "object") return undefined;
    return {
      title: e.title,
      errorType: e.error_type,
      message: e.details?.map((d) => d.message).filter(Boolean).join("; ") || e.message,
    };
  } catch {
    return undefined;
  }
}

export function formatProjectsError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const err = parseError(raw);
  if (!err) {
    const trimmed = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes)` : raw;
    return `Zoho Projects ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Projects ${status} for ${method} ${path}: ${err.title ?? "?"}${
    err.message ? ` — ${err.message}` : ""
  }`;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  query?: Query;
  /** Sent as the JSON body. */
  body?: unknown;
  version?: ApiVersion;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** URL-encode one path segment. */
export const enc = encodeURIComponent;

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes every request
 * through the auth `sign` hook, which stamps `Bearer`.
 */
export class ProjectsClient {
  readonly host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  url(path: string, query?: Query, version: ApiVersion = "v3"): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    return `https://${this.host}/api/${version}${path}${s ? `?${s}` : ""}`;
  }

  async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(this.url(path, opts.query, opts.version), {
      method,
      headers,
      body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(formatProjectsError(res.status, method, path, text));
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Zoho Projects ${res.status} for ${method} ${path}: non-JSON body`);
    }
  }

  get<T = unknown>(path: string, query?: Query, version?: ApiVersion): Promise<T> {
    return this.request<T>("GET", path, { query, version });
  }
}

/**
 * Shape a list response: the records plus the paging state. Accepts the documented
 * `{ page_info, <key>: [...] }` envelope, a bare array, or (defensively) any single
 * array-valued member.
 */
export function listResult(body: unknown, key: string): {
  items: unknown[];
  hasNext: boolean;
  page: number;
} {
  if (Array.isArray(body)) return { items: body, hasNext: false, page: 1 };
  const obj = (body ?? {}) as Record<string, unknown>;
  let items = obj[key];
  if (!Array.isArray(items)) {
    items = Object.entries(obj).find(([k, v]) => k !== "page_info" && Array.isArray(v))?.[1] ?? [];
  }
  const raw = obj.page_info;
  const info = (Array.isArray(raw) ? raw[0] : raw) as
    | { has_next_page?: boolean | string; page?: number | string }
    | undefined;
  return {
    items: items as unknown[],
    hasNext: info?.has_next_page === true || info?.has_next_page === "true",
    page: Number(info?.page ?? 1) || 1,
  };
}

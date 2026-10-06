import type { HookContext } from "@w6w/types";

/**
 * Raisely API v3 REST client.
 *
 * Verified 2026-10-06 against Raisely's own OpenAPI 3.0.0 document ("Raisely API", version 3.0 —
 * the ReadMe registry document behind https://developers.raisely.com/reference) plus live probes
 * against `api.raisely.com`.
 *
 * ## One host, one prefix, one envelope
 *
 * The document declares one production server, `https://api.raisely.com/v3`. A single record is
 * answered as `{"data": {...}}`; a list as `{"data": [...], "pagination": {...}}` where
 * `pagination` is `{total, pages, prevUrl, nextUrl, offset, limit}` and paging is driven by the
 * `limit` / `offset` query parameters. Request bodies for create/update are wrapped the same way:
 * `{"data": {...}}`, with a few top-level siblings (`overwriteCustomFields`, `merge`).
 *
 * ## Public reads work without a credential — so ask for the private record
 *
 * The document's global security is `[{}, {BearerAuth: []}]` — the empty requirement means
 * "anonymous is fine". Live, an unsigned `GET /campaigns` answers 403 `forbidden` (the
 * organisation scoping is missing), but with `private=true` and a valid key the same route answers
 * the full record. This client's callers pass `private=true` wherever the operation documents it.
 *
 * ## Errors
 *
 * Every non-2xx body is `{detail, type, status, code, instance, time, errors: [...]}` where
 * `code` is one of `unauthorized | forbidden | not found | gone | rate limit exceeded |
 * internal error`. Measured live: an unsigned request answers `403 forbidden`; a bogus bearer
 * answers `401 unauthorized` with `errors[0].subcode: "invalid token"`.
 *
 * ## User access tokens are scrubbed
 *
 * User records carry a per-user `accessToken` ("a secret token for this user, used to
 * authenticate them against the API"). {@link scrub} deletes that key, at any depth, from every
 * response so it never reaches a workflow run.
 */

export const API_BASE = "https://api.raisely.com";
export const API_PREFIX = "/v3";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The `pagination` object every list endpoint carries. */
export interface Pagination {
  total: number;
  pages: number;
  prevUrl: string | null;
  nextUrl: string | null;
  offset: number;
  limit: number;
}

export interface ListEnvelope<T = unknown> {
  data: T[];
  pagination: Pagination;
}

interface RaiselyErrorBody {
  detail?: string;
  code?: string;
  status?: number;
  errors?: Array<{ message?: string; detail?: string; code?: string; subcode?: string }>;
}

/** Drop keys the caller left unset; `false` and `0` are real values and survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
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

/** Percent-encode one path segment (a uuid, a profile path, a domain). */
export function seg(value: string): string {
  return encodeURIComponent(String(value).trim());
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Delete every `accessToken` key (a user's login token) from a parsed response, at any depth. */
export function scrub<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) scrub(item);
  } else if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    delete rec.accessToken;
    for (const v of Object.values(rec)) scrub(v);
  }
  return value;
}

/** Read Raisely's error body — `code` and `detail`, plus the first nested error's subcode. */
export function parseError(raw: string): { code?: string; detail?: string; subcode?: string } {
  try {
    const body = JSON.parse(raw) as RaiselyErrorBody;
    return {
      code: body.code ?? body.errors?.[0]?.code,
      detail: body.detail ?? body.errors?.[0]?.message,
      subcode: body.errors?.[0]?.subcode,
    };
  } catch {
    return {};
  }
}

/** Turn Raisely's error body into one actionable line. */
export function formatRaiselyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const { code, detail, subcode } = parseError(raw);
  if (!code && !detail) {
    return `Raisely ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }
  const parts = [
    `Raisely ${status} for ${method} ${path}`,
    code,
    subcode,
    detail,
    status === 429 ? "rate limited — retry later" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1200);
}

export class RaiselyClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": ...}` in, scrubbed `data` out — a single record. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** The full `{data, pagination}` envelope, for a list endpoint. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ListEnvelope<T>> {
    return await this.json<ListEnvelope<T>>(path, options);
  }

  /** Parse and scrub the body without unwrapping any envelope. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return scrub(JSON.parse(text)) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(formatRaiselyError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/** The subset of `obj` named by `keys`, unset values dropped. */
export function pick<T extends object>(
  obj: T,
  keys: Array<keyof T & string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = obj[k];
  return compact(out);
}

/** The `public` / `private` custom-field objects, from their JSON params. */
export function customFields(
  input: { public?: unknown; private_fields?: unknown },
): Record<string, unknown> {
  return compact({
    public: asOptionalJson<Record<string, unknown>>(input.public, "public"),
    private: asOptionalJson<Record<string, unknown>>(input.private_fields, "private_fields"),
  });
}

/** Normalise a `multiselect` value (or a comma-separated string) into trimmed, non-empty uuids. */
export function toUuids(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
}

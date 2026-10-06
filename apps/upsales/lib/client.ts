import type { HookContext } from "@w6w/types";

/**
 * Upsales API v2 REST client.
 *
 * Verified 2026-10-06 against Upsales' own published Postman collection
 * (`api.upsales.com`, 32 folders) and live probes of `integration.upsales.com`.
 *
 * ## One host, one prefix, auth in the query string
 *
 * Every documented URL is `https://integration.upsales.com/api/v2/...?token=<API key>`.
 * The key travels as the `token` **query parameter** — there is no auth header. It is
 * injected by the Auth `sign` hook (`auth/api-key.ts`); nothing in this module or any
 * Action ever sees it.
 *
 * ## Envelope
 *
 * Success is `{"error": null, "metadata": {"total","limit","offset"}, "data": ...}`
 * (`metadata` on list endpoints only). A DELETE answers `{"error": null}` with no data.
 * Failure is `{"error": {"key","code","errorCode","msg"}}` — but an **unsigned or
 * rejected key answers a bare `text/plain` `Unauthorized`**, not JSON, and `GET /self`
 * spells its envelope key `errors` rather than `error`. {@link UpsalesClient} copes with
 * all three and never decides anything from the status code alone.
 *
 * ## Paging
 *
 * `limit` (default 1000, max 2000) and `offset` (entries to skip). The vendor's advice for
 * a full crawl is to sort on `id` and filter `id=gt:<last id>` rather than rely on offsets.
 *
 * ## Filtering
 *
 * Any field can be a query parameter, as `attribute=comparison:value` with comparison
 * `eq|ne|gt|gte|lt|lte`; custom fields are `custom=comparison:fieldId:value`. Actions expose
 * this as a `filter` object whose entries become query parameters.
 */

export const API_BASE = "https://integration.upsales.com";
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** An Upsales failure, carrying the vendor's own error `key` and `errorCode`. */
export class UpsalesError extends Error {
  readonly status: number;
  readonly key?: string;
  readonly errorCode?: number;
  constructor(message: string, status: number, key?: string, errorCode?: number) {
    super(message);
    this.name = "UpsalesError";
    this.status = status;
    this.key = key;
    this.errorCode = errorCode;
  }
}

interface ErrorObject {
  key?: string;
  code?: number;
  errorCode?: number;
  msg?: string;
}

interface Envelope {
  error?: ErrorObject | null;
  errors?: ErrorObject | ErrorObject[] | null;
  metadata?: { total?: number; limit?: number; offset?: number };
  data?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 400): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/** Path-escape a caller-supplied id. */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** `{id: n}` reference, or undefined when unset. */
export function ref(id: unknown): { id: number } | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  const n = Number(id);
  if (!Number.isFinite(n)) throw new Error(`"${id}" is not a numeric id`);
  return { id: n };
}

/** A list of `{id: n}` references from an array or comma-separated string. */
export function refs(ids: unknown): Array<{ id: number }> | undefined {
  if (ids === undefined || ids === null || ids === "") return undefined;
  const list = Array.isArray(ids) ? ids : String(ids).split(",");
  const out = list.map((s) => String(s).trim()).filter(Boolean).map((s) => ref(s)!);
  return out.length ? out : undefined;
}

/** Upsales stores most "active" flags as 1/0. */
export function bit(v: boolean | undefined): number | undefined {
  return v === undefined || v === null ? undefined : v ? 1 : 0;
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

/**
 * Merge the typed fields over the free-form `fields` object. Typed parameters win, so a
 * stray key in the JSON cannot silently override a value the user filled in a form.
 */
export function buildBody(
  extra: unknown,
  typed: Record<string, unknown>,
): Record<string, unknown> {
  const base = asOptionalJson<Record<string, unknown>>(extra, "fields") ?? {};
  if (typeof base !== "object" || Array.isArray(base)) {
    throw new Error("fields must be a JSON object");
  }
  return { ...base, ...compact(typed) };
}

/** Turn a `filter` object into query parameters. `token` is never accepted from a caller. */
export function filterQuery(filter: unknown): Record<string, QueryValue> {
  const f = asOptionalJson<Record<string, unknown>>(filter, "filter");
  if (!f) return {};
  if (typeof f !== "object" || Array.isArray(f)) throw new Error("filter must be a JSON object");
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === "token") continue;
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "object" ? JSON.stringify(v) : (v as QueryValue);
  }
  return out;
}

export interface ListResult {
  data: unknown[];
  total: number | undefined;
  limit: number | undefined;
  offset: number | undefined;
}

export class UpsalesClient {
  constructor(private readonly ctx: HookContext) {}

  /** Build the absolute URL for a path under `/api/v2`. */
  url(path: string, query: Record<string, QueryValue> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      // Upsales repeats a key to AND two comparisons (probability=gte:1&probability=lte:99).
      if (Array.isArray(v)) { for (const item of v) qs.append(k, item); }
      else qs.set(k, String(v));
    }
    const s = qs.toString();
    return `${API_BASE}${API_PREFIX}${path}${s ? `?${s}` : ""}`;
  }

  /** Perform a request and return the parsed envelope; throws {@link UpsalesError}. */
  async request(method: string, path: string, opts: RequestOptions = {}): Promise<Envelope> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(this.url(path, opts.query), init);
    const text = await res.text();
    let parsed: Envelope | null = null;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object" && !Array.isArray(j)) parsed = j as Envelope;
    } catch {
      parsed = null;
    }

    const err = firstError(parsed);
    if (!res.ok || err) {
      const label = err?.key ? ` ${err.key}` : "";
      const code = err?.errorCode !== undefined ? ` (errorCode ${err.errorCode})` : "";
      const msg = err?.msg ?? (parsed ? undefined : text.trim());
      throw new UpsalesError(
        `Upsales ${res.status}${label}${code}${msg ? `: ${truncate(msg)}` : ""}`,
        res.status,
        err?.key,
        err?.errorCode,
      );
    }
    if (!parsed) {
      // A 200 that is not JSON is a proxy page, not the API.
      throw new UpsalesError(
        `Upsales answered ${res.status} with a non-JSON body: ${truncate(text.trim(), 120)}`,
        res.status,
      );
    }
    return parsed;
  }

  /** Request and return `data` (undefined for a DELETE). */
  async data(method: string, path: string, opts: RequestOptions = {}): Promise<unknown> {
    return (await this.request(method, path, opts)).data;
  }

  /** `GET` a list endpoint and flatten the paging metadata. */
  async list(path: string, query: Record<string, QueryValue> = {}): Promise<ListResult> {
    const env = await this.request("GET", path, { query });
    return {
      data: Array.isArray(env.data) ? env.data : [],
      total: env.metadata?.total,
      limit: env.metadata?.limit,
      offset: env.metadata?.offset,
    };
  }
}

function firstError(env: Envelope | null): ErrorObject | undefined {
  if (!env) return undefined;
  const e = env.error ?? (Array.isArray(env.errors) ? env.errors[0] : env.errors);
  return e && typeof e === "object" ? e : undefined;
}

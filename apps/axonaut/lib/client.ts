import type { HookContext } from "@w6w/types";

/**
 * Axonaut REST client (API v2).
 *
 * Verified 2026-10-06 against the OpenAPI 3.0 document embedded in
 * `https://axonaut.com/api/v2/doc` (`<script id="swagger-data">`, 78 paths, server
 * `https://axonaut.com`) plus unauthenticated live probes of the host.
 *
 * ## One host, `/api/v2` prefix
 *
 * Every documented path is `/api/v2/...` on `axonaut.com`. The catalog's old
 * `/manager/ecommerceApi` documentation URL is a 404; the live reference is `/api/v2/doc`.
 *
 * ## Pagination is a HEADER
 *
 * List endpoints take the page number as a request **header** named `page`, not a query
 * parameter (the spec declares `in: header`). The documents publish no page size and no total, so
 * {@link AxonautClient.many} reports `nextPage` as the next number while a page came back
 * non-empty; the caller stops at the first empty page.
 *
 * ## Shapes
 *
 * Lists answer a **bare JSON array**; `many` wraps it as `{ items, count, page, nextPage }`
 * because a workflow step's output is an object. Writes answer the object.
 *
 * ## Errors
 *
 * Failures are `{"error": {"message": "...", "status_code": "403"}}` (note `status_code` is a
 * STRING). A missing `userApiKey` header answers `400 Bad request - Missing header :
 * "userApiKey"`; a wrong key answers `403 Forbidden access` (both measured 2026-10-06).
 */

export const API_BASE = "https://axonaut.com";
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Page number, sent as the `page` header. */
  page?: number;
}

export function baseHeaders(): Record<string, string> {
  return { accept: "application/json" };
}

export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim());
}

/** Drop undefined / null / empty-string entries. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) sp.append(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** The vendor's `{error: {message, status_code}}` envelope, read as a string. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const e = (body as Record<string, unknown>).error;
  if (e && typeof e === "object") {
    const m = (e as Record<string, unknown>).message;
    if (typeof m === "string" && m) return m;
  }
  return undefined;
}

/** True for the documented error envelope: `error.message` and `error.status_code` strings. */
export function isErrorEnvelope(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const e = (body as Record<string, unknown>).error;
  if (!e || typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  return typeof x.message === "string" && x.status_code !== undefined;
}

/** A JSON object given as an object or a JSON string. */
export function toObject(v: unknown, name: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`Axonaut: ${name} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Axonaut: ${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** A JSON array given as an array or a JSON string. */
export function toArray(v: unknown, name: string): unknown[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`Axonaut: ${name} is not valid JSON`);
    }
  }
  if (!Array.isArray(parsed)) throw new Error(`Axonaut: ${name} must be a JSON array`);
  return parsed;
}

export class AxonautClient {
  constructor(private ctx: HookContext) {}

  /** A single object, or `{ ok: true }` for an empty answer (e.g. `202` on delete). */
  async one<T = Record<string, unknown>>(path: string, opts: RequestOptions = {}): Promise<T> {
    const body = await this.send(path, opts);
    if (body === null || body === undefined) return { ok: true } as T;
    return body as T;
  }

  /** A list answered as a bare array, returned as `{ items, count, page, nextPage }`. */
  async many(
    path: string,
    opts: RequestOptions = {},
  ): Promise<{ items: unknown[]; count: number; page: number; nextPage: number | null }> {
    const body = await this.send(path, opts);
    if (!Array.isArray(body)) throw new Error(`Axonaut: expected a JSON array from ${path}`);
    const page = opts.page ?? 1;
    return { items: body, count: body.length, page, nextPage: body.length > 0 ? page + 1 : null };
  }

  private async send(path: string, opts: RequestOptions): Promise<unknown> {
    const headers = baseHeaders();
    if (opts.page !== undefined) headers["page"] = String(opts.page);
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${API_PREFIX}${path}${queryString(opts.query)}`, {
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
        if (res.ok) throw new Error(`Axonaut ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`Axonaut ${res.status}${msg ? `: ${msg}` : ""}`);
    }
    return parsed;
  }
}

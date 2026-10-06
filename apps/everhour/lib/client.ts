import type { HookContext } from "@w6w/types";

/**
 * Everhour REST client.
 *
 * Verified 2026-10-06 against the vendor's API Blueprint
 * (`https://jsapi.apiary.io/apis/everhour.apib`, HOST `https://api.everhour.com`) plus
 * unauthenticated live probes of `api.everhour.com`. The blueprint describes the API as BETA.
 *
 * ## One host, no prefix
 *
 * Every documented path hangs directly off `https://api.everhour.com` (`/projects`, `/tasks`,
 * `/team/time`, ...). There is no version segment: a version is chosen with the optional
 * `X-Accept-Version` header, which defaults to the newest (1.2). This client pins
 * {@link API_VERSION} so a vendor-side bump cannot change a workflow's responses unannounced.
 *
 * ## Shapes
 *
 * Lists answer a **bare JSON array** (no envelope, no cursor); the paged ones take
 * `page` + `limit`. {@link EverhourClient.many} wraps an array as `{ items, count }` because a
 * workflow step's output is an object. Writes answer the object; deletes answer `204` with no
 * body, which {@link EverhourClient.one} reports as `{ ok: true }`.
 *
 * ## Ids
 *
 * Projects, tasks and some other ids are strings `{platform}:{id}` (`ev:123`, `as:456`). The
 * colon is the documented literal form in every path, so {@link encodeId} leaves it alone and
 * escapes everything else that could change which resource a path names.
 *
 * ## Errors
 *
 * Failures are JSON `{"code": <http status>, "message": "..."}`. A missing key and a wrong key
 * answer the **same** `403 {"code":403,"message":"Access denied"}` (measured), so the body
 * cannot tell them apart. Rate limit is ~20 requests / 10 s per key; excess answers `429` with
 * a `Retry-After` header.
 */

export const API_BASE = "https://api.everhour.com";
export const API_VERSION = "1.2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Headers every request carries. The credential is not here — only `sign` adds it. */
export function baseHeaders(): Record<string, string> {
  return { accept: "application/json", "x-accept-version": API_VERSION };
}

/** Escape a path segment but keep the `:` of `ev:123`-style ids. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id).trim()).replace(/%3A/gi, ":");
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

/** Everhour's `{code, message}` error body, as a string. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  for (const k of ["message", "error", "detail"]) {
    if (typeof b[k] === "string" && b[k]) return b[k] as string;
  }
  return undefined;
}

/** True for the documented error envelope: a numeric `code` and a string `message`. */
export function isErrorEnvelope(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  return typeof b.code === "number" && typeof b.message === "string";
}

/** A comma-separated string or an array -> trimmed, non-empty strings. */
export function toList(v: string[] | string | number[] | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** A comma-separated string or an array -> numbers. Throws on a non-numeric entry. */
export function toNumberList(
  v: string[] | string | number[] | undefined | null,
): number[] | undefined {
  const items = toList(v);
  if (!items) return undefined;
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new Error(`Everhour: "${s}" is not a number`);
    return n;
  });
}

/** A JSON object given as an object or a JSON string. */
export function toObject(v: unknown, name: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`Everhour: ${name} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Everhour: ${name} must be a JSON object`);
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
      throw new Error(`Everhour: ${name} is not valid JSON`);
    }
  }
  if (!Array.isArray(parsed)) throw new Error(`Everhour: ${name} must be a JSON array`);
  return parsed;
}

/** `1` when the flag is on, otherwise omitted (the vendor's `opts_include_billing=1` form). */
export function one(flag: boolean | undefined): 1 | undefined {
  return flag ? 1 : undefined;
}

export class EverhourClient {
  constructor(private ctx: HookContext) {}

  /** A single object, or `{ ok: true }` for an empty (204) answer. */
  async one<T = Record<string, unknown>>(path: string, opts: RequestOptions = {}): Promise<T> {
    const body = await this.send(path, opts);
    if (body === null || body === undefined) return { ok: true } as T;
    return body as T;
  }

  /** A list answered as a bare array, returned as `{ items, count, nextPage }`. */
  async many(
    path: string,
    opts: RequestOptions = {},
  ): Promise<{ items: unknown[]; count: number; nextPage: number | null }> {
    const body = await this.send(path, opts);
    if (!Array.isArray(body)) {
      throw new Error(`Everhour: expected a JSON array from ${path}`);
    }
    const q = opts.query ?? {};
    const limit = Number(q.limit);
    const page = Number(q.page ?? 1);
    const nextPage = Number.isFinite(limit) && limit > 0 && body.length >= limit ? page + 1 : null;
    return { items: body, count: body.length, nextPage };
  }

  private async send(path: string, opts: RequestOptions): Promise<unknown> {
    const headers = baseHeaders();
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}${queryString(opts.query)}`, {
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
        if (res.ok) throw new Error(`Everhour ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      const retry = res.status === 429 ? ` (retry after ${res.headers.get("retry-after")}s)` : "";
      throw new Error(`Everhour ${res.status}${msg ? `: ${msg}` : ""}${retry}`);
    }
    return parsed;
  }
}

import type { HookContext } from "@w6w/types";

/**
 * Landbot Platform API client.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI 3.1 document
 * (`https://dev.landbot.io/api-reference/platform/openapi.json`, server `https://api.landbot.io/v1`)
 * plus unauthenticated live probes of `api.landbot.io`.
 *
 * ## Shapes
 *
 * - Every path ends in a **trailing slash** (`/customers/42/`). The slash is part of the route.
 * - Lists answer `{ success, total, <collection>: [...] }` with `offset` + `limit` paging
 *   (`limit` 0-100, default 20). {@link LandbotClient.list} returns the collection under its own
 *   name plus `total`, `count` and `nextOffset` (null on the last page).
 * - Single objects answer `{ success, <name>: {...} }`; {@link LandbotClient.get} unwraps it.
 * - Most state changes (`PUT .../archive/`, the `send_*` posts) answer `200` with no documented
 *   body; deletes answer `204`. Both come back as `{ ok: true }`.
 * - Errors are `{"errors": {"<field>": ["message"]}}` (403/412/422) or, for authentication, the
 *   DRF form `{"detail": "..."}` (401).
 *
 * ## Secrets that come back in reads
 *
 * A channel object carries its own `token`, and a message hook carries the `token` it was created
 * with. Both are working credentials, so {@link redactToken} replaces them before they leave the
 * app.
 */

export const API_BASE = "https://api.landbot.io/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Headers every request carries. The credential is not here — only `sign` adds it. */
export function baseHeaders(): Record<string, string> {
  return { accept: "application/json" };
}

/** Escape a path segment. */
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

/** Landbot's `{errors: {field: [msg]}}` or `{detail}` body, flattened to one string. */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string" && b.detail) return b.detail;
  const errors = b.errors;
  if (errors && typeof errors === "object") {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(errors as Record<string, unknown>)) {
      const list = Array.isArray(msgs) ? msgs.map(String).join(", ") : String(msgs);
      parts.push(`${field}: ${list}`);
    }
    if (parts.length) return parts.join("; ");
  }
  for (const k of ["message", "error"]) {
    if (typeof b[k] === "string" && b[k]) return b[k] as string;
  }
  return undefined;
}

/** Replace a non-empty `token` (channel token, hook secret) so it never leaves the app. */
export function redactToken<T>(obj: T): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const o = { ...(obj as Record<string, unknown>) };
  if (typeof o.token === "string" && o.token) o.token = "[redacted]";
  return o as T;
}

/** A JSON object given as an object or a JSON string. */
export function toObject(v: unknown, name: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let parsed = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error(`Landbot: ${name} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Landbot: ${name} must be a JSON object`);
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
      throw new Error(`Landbot: ${name} is not valid JSON`);
    }
  }
  if (!Array.isArray(parsed)) throw new Error(`Landbot: ${name} must be a JSON array`);
  return parsed;
}

/** A comma-separated string or an array -> trimmed, non-empty strings. */
export function toStringList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

export class LandbotClient {
  constructor(private ctx: HookContext) {}

  /** A state change or delete: `{ ok: true }`, merged with the body if the vendor sent an object. */
  async done(path: string, opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const body = await this.send(path, opts);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ok: true, ...(body as Record<string, unknown>) };
    }
    return { ok: true };
  }

  /** `{ success, <key>: {...} }` -> the inner object. */
  async get(
    path: string,
    key: string,
    opts: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    const body = await this.send(path, opts) as Record<string, unknown> | null;
    const inner = body?.[key];
    if (!inner || typeof inner !== "object") {
      throw new Error(`Landbot: expected a "${key}" object from ${path}`);
    }
    return inner as Record<string, unknown>;
  }

  /** `{ success, total, <key>: [...] }` -> `{ <key>, total, count, nextOffset }`. */
  async list(
    path: string,
    key: string,
    opts: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    const body = await this.send(path, opts) as Record<string, unknown> | null;
    const items = body?.[key];
    if (!Array.isArray(items)) throw new Error(`Landbot: expected a "${key}" array from ${path}`);
    const q = opts.query ?? {};
    const offset = Number(q.offset ?? 0) || 0;
    const total = typeof body?.total === "number" ? body.total : undefined;
    const next = offset + items.length;
    const more = total !== undefined ? next < total : false;
    const out: Record<string, unknown> = { [key]: items, count: items.length };
    if (total !== undefined) out.total = total;
    out.nextOffset = more && items.length > 0 ? next : null;
    return out;
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
        if (res.ok) return null;
      }
    }
    if (!res.ok) {
      const msg = errorText(parsed) ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`Landbot ${res.status}${msg ? `: ${msg}` : ""}`);
    }
    return parsed;
  }
}

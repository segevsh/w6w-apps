import type { HookContext } from "@w6w/types";

/**
 * Resend's REST API — one host, one version, no regional variants. Verified
 * against Resend's own OpenAPI document (https://resend.com/openapi.json,
 * v1.5.0, fetched 2026-08-18): `servers` names exactly
 * `https://api.resend.com`, and the only security scheme is `bearerAuth`
 * (`{"type":"http","scheme":"bearer"}`).
 *
 * Resend's docs add that HTTPS is enforced and that there is no versioning
 * system today — "we plan to add versioning via calendar-based headers in the
 * future" — so paths carry no version segment and this client adds none.
 */
export const API_URL = "https://api.resend.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Usually an object, but `POST /emails/batch` takes a bare array as its whole
   * body — verified in the OpenAPI document, whose request schema for that path
   * is `{"type":"array","items":{"$ref":"…SendEmailRequest"}}` — so this is
   * deliberately not narrowed to an object.
   */
  body?: unknown;
  /**
   * Resend's `Idempotency-Key` header, accepted on the two send endpoints. It
   * is what makes a retried send safe, so it is threaded through rather than
   * left to chance.
   */
  idempotencyKey?: string;
}

/** Drop keys the caller left unset so a PATCH doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Resend types `to`, `cc`, `bcc` and `reply_to` as `oneOf` a string or an array
 * of strings, so a single recipient may go either way. A form carries one
 * comma-separated field; this returns the array form when there is more than
 * one address and the bare string when there is exactly one, which is the
 * shape the API's own examples use.
 *
 * `to` is capped at 50 addresses by the schema (`maxItems: 50`); the caller is
 * told here rather than by a 422.
 */
export function addresses(
  value: unknown,
  field: string,
  max?: number,
): string | string[] | undefined {
  if (Array.isArray(value)) {
    const list = value.map((v) => String(v).trim()).filter(Boolean);
    if (!list.length) return undefined;
    if (max && list.length > max) {
      throw new Error(`\`${field}\` accepts at most ${max} addresses — got ${list.length}`);
    }
    return list.length === 1 ? list[0] : list;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const list = value.split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return undefined;
  if (max && list.length > max) {
    throw new Error(`\`${field}\` accepts at most ${max} addresses — got ${list.length}`);
  }
  return list.length === 1 ? list[0] : list;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ResendClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Resend answers `{ statusCode, message, name }` — the `name` is a stable
      // machine code (`missing_api_key`, `validation_error`, `not_found`) and
      // the message says which field, so both are surfaced verbatim.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Resend ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Resend's cursor pagination until `wantTotal` items are collected or
   * a page reports no more.
   *
   * The contract, from the shared `PaginationLimit` / `PaginationAfter` /
   * `PaginationBefore` parameters and the list response shape
   * `{ object, has_more, data }`: `after` takes the **id of the last item on
   * the page**, and `has_more` says whether asking again is worth it. Not every
   * list endpoint paginates — `/audiences` and `/contacts` answer
   * `{ object, data }` with no `has_more` — so a missing flag ends the loop
   * rather than looping forever.
   */
  async requestAll<T extends { id?: string } = { id?: string }>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let after: string | undefined;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; has_more?: boolean }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, after },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      const last = chunk[chunk.length - 1];
      if (!page?.has_more || chunk.length === 0 || !last?.id) break;
      after = last.id;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

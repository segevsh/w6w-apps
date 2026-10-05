import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mighty Networks Admin API client.
 *
 * Source of truth: the OpenAPI 3.1 document at
 * <https://api.mn.co/admin/v1/spec/rest.json> (server `https://api.mn.co`) and the prose docs at
 * <https://docs.mightynetworks.com>. Every path below is
 * `/admin/v1/networks/{network_id}/…`.
 *
 * ## Where the network id lives
 *
 * Every route is scoped to one Network, and the API key belongs to exactly one Network
 * ("Returns details of the Network - must match the Network owning the requesting API key"). So
 * the id is a property of the Connection, not of each call: it is a non-secret `networkId` field on
 * the auth method, and actions read it from `ctx.connection.display.networkId`. The spec's
 * `networkId` path parameter accepts either the integer id or the subdomain
 * (`^[a-z][a-z0-9-]+$`); both are accepted here.
 *
 * ## Response shapes
 *
 * The OpenAPI document references `…ResponsePaged` schemas for every list route but never defines
 * them (they are dangling `$ref`s), and the prose docs describe two different envelopes
 * (`{data, meta}` on one page, `{items, links}` on another). The list shape is therefore
 * unconfirmed, so list actions return the body untouched under `result` and additionally lift
 * `items` out of it when the body is an array or carries an `items`/`data` array.
 */

export const API_HOST = "api.mn.co";

export const API_URL = `https://${API_HOST}/admin/v1`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/** The integer id or the subdomain — the two forms the spec's `networkId` parameter allows. */
export const NETWORK_ID_PATTERN = /^([0-9]+|[a-z][a-z0-9-]+)$/;

/** Read the Network id off the Connection's public metadata. Throws a fixable message. */
export function networkIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { networkId?: unknown };
  const id = String(display.networkId ?? "").trim();
  if (!id) {
    throw new Error(
      "this connection has no Network ID — reconnect it with the Network ID field set",
    );
  }
  if (!NETWORK_ID_PATTERN.test(id)) {
    throw new Error(
      `Network ID "${id}" is not a numeric id or a subdomain (lowercase letters, digits, hyphens)`,
    );
  }
  return id;
}

/** Drop undefined / null / empty-string entries so optional params never reach the wire. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** `"1, 2,3"` -> `[1, 2, 3]`; empty / absent -> undefined. Throws on a non-numeric entry. */
export function idList(v: string | undefined): number[] | undefined {
  if (v === undefined || v === null || String(v).trim() === "") return undefined;
  const out: number[] = [];
  for (const part of String(v).split(",")) {
    const t = part.trim();
    if (!t) continue;
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0) throw new Error(`"${t}" is not a valid id`);
    out.push(n);
  }
  return out.length ? out : undefined;
}

interface MightyError {
  error?: unknown;
  message?: unknown;
}

/** Pull the vendor's own error text out of a failure body. */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as MightyError;
    const parts = [body?.error, body?.message].filter((p): p is string =>
      typeof p === "string" && p.length > 0
    );
    if (parts.length) return [...new Set(parts)].join(": ");
  } catch {
    // Not JSON — a gateway or CDN error page.
  }
  return text.slice(0, 400);
}

/** The shape every list action returns. */
export interface ListResult {
  items: unknown[] | null;
  result: unknown;
}

export function listResult(body: unknown): ListResult {
  if (Array.isArray(body)) return { items: body, result: body };
  const obj = (body ?? {}) as { items?: unknown; data?: unknown };
  const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.data) ? obj.data : null;
  return { items, result: body ?? null };
}

export class MightyClient {
  private networkId: string;

  constructor(private ctx: HookContext, networkId?: string) {
    this.networkId = networkId ?? networkIdFromConnection(ctx.connection);
  }

  /** `path` is relative to the Network, e.g. `/members` or `/` for the Network itself. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = `${API_URL}/networks/${encodeURIComponent(this.networkId)}`;
    const url = new URL(path === "/" ? `${base}/` : `${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    // No Authorization header: the runtime routes the request through the auth `sign` hook.
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = errorMessage(await res.text().catch(() => ""));
      throw new Error(
        `Mighty Networks ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    const text = res.status === 204 ? "" : await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Encode one path segment. */
export const seg = (v: string | number): string => encodeURIComponent(String(v));

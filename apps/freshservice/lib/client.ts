import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Freshservice gives every account its own host — `acme.freshservice.com`.
 * The v2 docs are explicit that the API "works only via Freshservice domains
 * and not via custom CNAMEs", so the set of reachable hosts is exactly
 * `*.freshservice.com` and nothing wider is needed:
 *
 *   - `w6w.network.allow` declares `*.freshservice.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and this module reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * This mirrors the sibling `freshdesk` app deliberately: same vendor family,
 * same per-tenant host shape, same Basic-auth scheme. Diverging would make
 * two nearly identical products behave differently for no reason.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Freshservice connection has no domain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(domain: string): string {
  return `https://${domain}.freshservice.com/api/v2`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse a "Custom fields" JSON param into Freshservice's flat `{ name: value }`
 * map. Accepts either that map directly, or a JSON string of it.
 */
export function customFields(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('`customFields` must be a JSON object, e.g. { "product": "CRM" }.');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  return entries.length ? parsed as Record<string, unknown> : undefined;
}

/**
 * Freshservice envelopes every payload under the resource name —
 * `{ "ticket": {…} }` for a single object and `{ "tickets": [ … ] }` for a
 * collection. Unwrapping here keeps 23 actions from each repeating the same
 * `body.ticket ?? body` dance, and keeps the shape an Action returns stable
 * if a future endpoint ever stops enveloping.
 */
export function unwrap<T = unknown>(payload: unknown, key: string): T {
  if (payload && typeof payload === "object" && key in (payload as Record<string, unknown>)) {
    return (payload as Record<string, T>)[key];
  }
  return payload as T;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class FreshserviceClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Freshservice returns { description, errors: [{ field, message, code }] }
      // for validation failures — the body is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Freshservice ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `request` plus the resource-key unwrap the v2 API applies to every payload. */
  async resource<T = unknown>(
    key: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return unwrap<T>(await this.request(path, options), key);
  }
}

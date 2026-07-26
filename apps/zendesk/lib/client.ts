import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zendesk gives every account its own host — `acme.zendesk.com`. A manifest
 * cannot enumerate those, so `w6w.network.allow` declares the wildcard
 * `*.zendesk.com`; the runtime's egress matcher accepts any subdomain of it
 * while still refusing everything else.
 *
 * The subdomain itself comes from the Connection, not from an Action param:
 * both auth methods stash it on the connection's redacted `display` in
 * `afterConnect`, and the client reads it from there.
 */
export function subdomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { subdomain?: string };
  if (display.subdomain) return display.subdomain;
  throw new Error(
    "Zendesk connection has no subdomain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(subdomain: string): string {
  return `https://${subdomain}.zendesk.com/api/v2`;
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
 * Parse the "Custom fields" JSON param into Zendesk's `[{ id, value }]` shape.
 * Accepts either that array directly, or the friendlier `{ "360001": "x" }` map.
 */
export function customFields(raw: unknown): Array<{ id: number; value: unknown }> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (Array.isArray(parsed)) return parsed as Array<{ id: number; value: unknown }>;
  if (typeof parsed !== "object") {
    throw new Error("`customFields` must be a JSON object or an array of { id, value }.");
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (!entries.length) return undefined;
  return entries.map(([id, value]) => ({ id: Number(id), value }));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ZendeskClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(subdomainFromConnection(ctx.connection));
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
      // Zendesk returns { error, description } or { details: { field: [...] } }
      // — the body is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Zendesk ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

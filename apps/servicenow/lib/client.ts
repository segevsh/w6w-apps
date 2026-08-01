import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * ServiceNow gives every customer their own host — `acme.service-now.com`. A
 * manifest cannot enumerate those, so `w6w.network.allow` declares the
 * wildcard `*.service-now.com`; the runtime's egress matcher accepts any
 * subdomain of it while still refusing everything else.
 *
 * The instance name itself comes from the Connection, not from an Action
 * param: both auth methods record it on the connection's redacted `display`
 * (basic directly from the credential's `instance` field, oauth2 from the
 * `instance` field collected alongside the exchanged token), and the client
 * reads it from there.
 */
export function instanceFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { instance?: string };
  if (display.instance) return display.instance;
  throw new Error(
    "ServiceNow connection has no instance — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(instance: string): string {
  return `https://${instance}.service-now.com`;
}

/** Root of the Table API — every action path below is relative to this. */
export function apiUrl(instance: string): string {
  return `${baseUrl(instance)}/api/now`;
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

/**
 * Parse the "Fields" JSON param — an arbitrary map of column name -> value —
 * into the plain object the Table API expects as the request body.
 */
export function fieldsBody(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("`fields` must be a JSON object of column name -> value.");
  }
  return parsed as Record<string, unknown>;
}

/** `/table/<table>` or `/table/<table>/<sysId>`, each segment encoded. */
export function tablePath(table: string, sysId?: string): string {
  const t = encodeURIComponent(table);
  return sysId ? `/table/${t}/${encodeURIComponent(sysId)}` : `/table/${t}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ServiceNowClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = apiUrl(instanceFromConnection(ctx.connection));
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
      // ServiceNow returns { error: { message, detail }, status } — the body
      // is where the actionable part is (e.g. "no records found" vs. an ACL
      // rejection).
      const detail = await res.text().catch(() => "");
      throw new Error(
        `ServiceNow ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

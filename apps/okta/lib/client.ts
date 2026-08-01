import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Okta gives every org its own host — `dev-12345.okta.com` (or a
 * `*.oktapreview.com` sandbox). A manifest cannot enumerate those, so
 * `w6w.network.allow` declares the wildcards `*.okta.com` and
 * `*.oktapreview.com`; the runtime's egress matcher accepts any subdomain of
 * either while still refusing everything else.
 *
 * The domain itself comes from the Connection, not from an Action param: it
 * identifies the org, so it belongs to the Auth `domain` field. `afterConnect`
 * echoes it onto the connection's redacted `display`, and this client reads it
 * from there — so it can address the right host without ever seeing a
 * credential.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Okta connection has no domain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(domain: string): string {
  return `https://${domain}/api/v1`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a partial update doesn't null out untouched fields. */
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
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class OktaClient {
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
      // Okta returns { errorSummary, errorCauses: [...] } — the body is where
      // the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Okta ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

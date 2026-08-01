import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Splunk Cloud Platform gives every customer their own stack — a hostname
 * like `acme.splunkcloud.com`, fronting the management/REST API on port
 * 8089 (`https://acme.splunkcloud.com:8089/services/...`; verified against
 * a live example in Splunk's own token-auth documentation). A static
 * manifest cannot enumerate those hosts, so:
 *
 *   - `w6w.network.allow` declares the wildcard `*.splunkcloud.com`. The
 *     runtime's egress matcher accepts any subdomain of it and still
 *     refuses everything else — including any self-hosted / on-prem Splunk
 *     install, which this app deliberately does not support (see README).
 *   - the stack hostname is an Auth field, not an Action param: it
 *     identifies the tenant, so it belongs to the Connection. `afterConnect`
 *     records it on the connection's redacted `display`, and this module
 *     reads it from there — so the client can address the right host
 *     without ever seeing the credential.
 */
export function stackFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { stack?: string };
  if (display.stack) return display.stack;
  throw new Error(
    "Splunk connection has no stack hostname — reconnect the account so it can be recorded.",
  );
}

/** The management/REST API always lives on port 8089, even on Splunk Cloud. */
export function baseUrl(stack: string): string {
  return `https://${stack}:8089`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Splunk's classic `/services/...` endpoints (job creation, saved-search
   * creation, …) take `application/x-www-form-urlencoded` bodies, not JSON —
   * a long-standing quirk of the platform's REST design that predates
   * JSON-body conventions. There is no `body` option on this client for that
   * reason: every write goes through `form`.
   */
  form?: Record<string, string | number | boolean | undefined | null>;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook. Every request asks for
 * `output_mode=json`; Splunk defaults to Atom/XML otherwise.
 */
export class SplunkClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(stackFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    url.searchParams.set("output_mode", "json");
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, String(v));
      }
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Splunk's error body is `{ messages: [{ type, text }] }` — the `text`
      // is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Splunk ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

import type { HookContext, RedactedConnection } from "@w6w/types";

/** The Zoho CRM REST API version this app targets. */
export const API_VERSION = "v6";

/**
 * Default (United States data centre) API host. Zoho hosts customer data in
 * one of several regional data centres — US, EU, IN, AU, JP, CN, CA, SA — each
 * with its own `www.zohoapis.<tld>` API host and its own `accounts.zoho.<tld>`
 * OAuth host. The token response for a successful OAuth exchange carries
 * `api_domain`, naming the host that matches the *authorizing* account's data
 * centre; `auth/oauth2.ts`'s `afterConnect` records it on the connection's
 * `display` so every request after that addresses the right host.
 *
 * This app's `oauth2` method only offers the US authorization/token endpoints
 * (`accounts.zoho.com`), so in practice every connection it creates resolves
 * to the US API host below — see the README's "Regional accounts" section for
 * the EU/IN/AU/JP/CN/CA/SA limitation this implies and what it would take to
 * lift it.
 */
export const DEFAULT_API_DOMAIN = "https://www.zohoapis.com";

export function apiDomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiDomain?: string };
  return (display.apiDomain ?? DEFAULT_API_DOMAIN).replace(/\/+$/, "");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Zoho CRM module and field API names are identifiers, not free text. */
export function moduleName(name: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(
      `\`${name}\` is not a valid Zoho CRM module API name (letters, digits and underscores only).`,
    );
  }
  return name;
}

interface ZohoErrorBody {
  code?: string;
  message?: string;
  status?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoClient {
  private domain: string;

  constructor(private ctx: HookContext) {
    this.domain = apiDomainFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.domain}/crm/${API_VERSION}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        // A request-level failure (bad token, malformed query) answers with a
        // single object, not the per-record `data` array insert/update/delete
        // use — `code` + `message` is the actionable part either way.
        const parsed = JSON.parse(text) as ZohoErrorBody;
        detail = [parsed.code, parsed.message].filter(Boolean).join(" ") || text;
      } catch { /* keep the raw body */ }
      throw new Error(`Zoho CRM ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** One entry of the `data` array insert/update/delete/convert all answer with. */
export interface ZohoRecordResult {
  code: string;
  details?: Record<string, unknown>;
  message?: string;
  status: "success" | "error";
}

/**
 * Insert, update, delete and convert all answer `{ data: [ {code,status,...} ] }`
 * — one entry per record submitted, batch-style, even for a single record.
 * This app always submits one record per call, so unwrap that single entry —
 * and surface a per-item failure (`status: "error"`) as a thrown error even
 * when the HTTP status itself was 2xx, which is how Zoho reports a rejected
 * record inside an otherwise-successful batch response.
 */
export function unwrapRecordResult(body: { data?: ZohoRecordResult[] }): ZohoRecordResult {
  const entry = body.data?.[0];
  if (!entry) throw new Error("Zoho CRM returned no result entry");
  if (entry.status === "error") {
    throw new Error(`Zoho CRM ${entry.code}: ${entry.message ?? "request failed"}`);
  }
  return entry;
}

/** Parse a "Fields" JSON param into the record body Zoho expects. */
export function fields(raw: unknown, paramName = "fields"): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}

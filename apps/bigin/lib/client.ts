/**
 * Thin wrapper over `ctx.fetch` for Bigin's REST API
 * (`https://www.zohoapis.com/bigin/v2/...`, and its seven regional siblings).
 *
 * Shape, and why it is copied from the `zoho` (Zoho CRM) sibling rather than
 * re-invented: Bigin's API is the same ZGS generation of Zoho's platform, so
 * the wire conventions are identical —
 *
 *   - **A data-centre-aware base URL, resolved per connection.** The OAuth
 *     token response carries `api_domain` (e.g. `https://www.zohoapis.eu`),
 *     naming the host that matches the authorizing account's data centre;
 *     `auth/oauth2.ts`'s `afterConnect` lifts it onto the connection's
 *     `display`, and this client reads it back on every call. The US host is
 *     the fallback, not the assumption — see `lib/regions.ts`.
 *   - **The `data[0]` record-result envelope** for insert/update/delete:
 *     `{"data":[{"code","details","message","status"}]}`, one entry per record,
 *     batch-shaped even for a single record (`unwrapRecordResult`).
 *   - **A single error object** for everything else, with the vendor's own
 *     machine-readable `code`: `{"code":"INVALID_TOKEN","details":{},"message":
 *     "invalid oauth token","status":"error"}` — measured live 2026-09-22
 *     against `GET /bigin/v2/users?type=CurrentUser` with a bogus token, and
 *     the shape documented on
 *     https://www.bigin.com/developer/docs/apis/v2/status-codes.html.
 *
 * It never sets `Authorization` — the runtime routes every request through the
 * auth `sign` hook, which stamps `Zoho-oauthtoken`.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";
import { DEFAULT_API_DOMAIN, normalizeDomain } from "./regions.ts";

/** The Bigin REST API version this app targets. */
export const API_VERSION = "v2";

/** Path prefix every Bigin endpoint shares: `/bigin/v2`. */
export const API_PREFIX = `/bigin/${API_VERSION}`;

export { DEFAULT_API_DOMAIN };

/** The API host recorded by `afterConnect`, or the US default. */
export function apiDomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiDomain?: string };
  return normalizeDomain(display.apiDomain ?? DEFAULT_API_DOMAIN);
}

/**
 * The API host named by a credential. Zoho's token response names the field
 * `api_domain`; a host that camel-cases response fields would produce
 * `apiDomain`. Both are accepted rather than betting on one — the same
 * defensive read the `zoho` sibling performs.
 */
export function apiDomainFromCredential(
  credential: { apiDomain?: string; api_domain?: string },
): string {
  return normalizeDomain(credential.apiDomain ?? credential.api_domain ?? DEFAULT_API_DOMAIN);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Bigin module and field API names are identifiers, not free text. */
export function moduleName(name: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(
      `\`${name}\` is not a valid Bigin module API name (letters, digits and underscores only).`,
    );
  }
  return name;
}

interface BiginErrorBody {
  code?: string;
  message?: string;
  status?: string;
}

export class BiginClient {
  private domain: string;

  constructor(private ctx: HookContext) {
    this.domain = apiDomainFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.domain}${API_PREFIX}${path}`);
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
        // A request-level failure answers with a single object carrying the
        // vendor's own machine-readable `code` and a human `message`; that pair
        // is what makes a failure actionable, so it is surfaced verbatim.
        const parsed = JSON.parse(text) as BiginErrorBody;
        detail = [parsed.code, parsed.message].filter(Boolean).join(" ") || text;
      } catch { /* keep the raw body */ }
      throw new Error(`Bigin ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** One entry of the `data` array insert/update/delete answer with. */
export interface BiginRecordResult {
  code: string;
  details?: Record<string, unknown>;
  message?: string;
  status: "success" | "error";
}

/**
 * Insert, update and delete all answer `{ data: [ {code,status,...} ] }` — one
 * entry per record submitted, batch-style, even for a single record. This app
 * always submits one record per call, so unwrap that single entry — and surface
 * a per-item failure (`status: "error"`) as a thrown error even when the HTTP
 * status was 2xx, which is how Zoho reports a rejected record inside an
 * otherwise-successful batch response.
 */
export function unwrapRecordResult(body: { data?: BiginRecordResult[] }): BiginRecordResult {
  const entry = body.data?.[0];
  if (!entry) throw new Error("Bigin returned no result entry");
  if (entry.status === "error") {
    throw new Error(`Bigin ${entry.code}: ${entry.message ?? "request failed"}`);
  }
  return entry;
}

/** Parse a "Fields" JSON param into the record body Bigin expects. */
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

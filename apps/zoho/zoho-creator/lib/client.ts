import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Creator REST API v2 client.
 *
 * Every path, header, query/body parameter and response shape here was verified on
 * 2026-09-29 against Zoho's own documentation — the live pages under
 * `https://www.zoho.com/creator/help/api/v2/` (`things-to-know.html`,
 * `oauth-overview.html`, `status-codes.html`, `get-applications.html`,
 * `get-forms.html`, `get-reports.html`, `get-fields.html`, `get-records.html`,
 * `add-records.html`, `update-records.html`, `delete-records.html`,
 * `upload-file.html`, `download-file.html`) — and live probes against every
 * regional API host (see `lib/regions.ts`). Unlike Zoho Analytics, these doc pages
 * ARE reachable from a normal crawl (real `<a href>` links, present in
 * `oauth-overview.html`/`things-to-know.html`'s own body) — no Wayback Machine
 * detour was needed here.
 *
 * ## The base URL is the shared `www.zohoapis.<tld>` gateway
 *
 * `oauth-overview.html` publishes an explicit nine-row "API endpoints by data
 * centre" table naming `www.zohoapis.<tld>` for every region — the same gateway
 * `zohobooks`/`zoho-invoice` address, not a dedicated `creator.zoho.<tld>` host (see
 * `lib/regions.ts` for the full finding, including why Canada's API host does NOT
 * carry the `zohocloud.ca` substitution here even though its accounts host does).
 *
 * ## Two response envelopes, not one
 *
 * A request-level failure (bad/expired token, malformed URL, disabled API access,
 * ...) answers `{"code":N,"description":"..."}` at a non-2xx HTTP status — verified
 * live: an unauthenticated call answers `401
 * {"code":1030,"description":"Authorization Failure. The access token is either
 * invalid or has expired. ..."}`, identically whether the `Authorization` header is
 * missing entirely or carries a syntactically-plausible but dead token (unlike Zoho
 * Analytics' two distinguishable codes 8518/8535 — Creator's `status-codes.html`
 * only documents the one family, `1030`, for both cases; `1040` is a **different**
 * problem, an unknown `account_owner_name`, and `1130` yet another, the API-access
 * permission being disabled for the user — {@link formatCreatorError} surfaces
 * whichever code came back rather than guessing).
 *
 * `add-records`/`update-records`/`delete-records` (the per-record bulk operations)
 * answer 200 with a DIFFERENT envelope even when some of the records inside it
 * failed: `{"result":[{"code":N,"data":{...},"message"|"error":...}, ...],"code":N}`
 * — a per-record `code`/`error` inside `result` is not a request-level failure, so
 * this client passes that envelope through as-is rather than throwing; the caller
 * (a workflow) inspects each item.
 *
 * ## Get Records answers 404 for "nothing matched" — not a real error
 *
 * `status-codes.html` documents `404 NOT FOUND / 3100 / "No records found for the
 * given criteria."` as the response to a Get Records call whose criteria matched
 * nothing. That is a legitimate empty result, not a request-level failure — thrown
 * errors from {@link ZohoCreatorClient.request} carry the parsed `code`
 * ({@link ZohoCreatorApiError}) so `actions/record-list.ts` can tell code `3100`
 * apart from every other failure and return an empty array instead of surfacing an
 * error to the workflow.
 */

/** Every documented Creator v2 endpoint hangs off this path segment. */
export const API_PREFIX = "/creator/v2";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts` for why there is no single `oauth2` method with a data-centre
 * field). Falls back to the US host only for a Connection that predates
 * `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** A request-level Zoho Creator failure — `{"code":N,"description":"..."}` at a non-2xx status. */
export class ZohoCreatorApiError extends Error {
  constructor(public readonly code: number | undefined, message: string) {
    super(message);
    this.name = "ZohoCreatorApiError";
  }
}

interface CreatorErrorBody {
  code?: number;
  description?: string;
}

/**
 * Turn a Zoho Creator request-level error response into one actionable line, and
 * carry the parsed `code` so a caller (like `record-list`'s 3100 handling) can act
 * on it programmatically instead of pattern-matching the message text.
 */
export function formatCreatorError(
  status: number,
  method: string,
  path: string,
  raw: string,
): ZohoCreatorApiError {
  let parsed: CreatorErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CreatorErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.description) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return new ZohoCreatorApiError(
      parsed?.code,
      `Zoho Creator ${status} for ${method} ${path}: ${trimmed}`,
    );
  }
  return new ZohoCreatorApiError(
    parsed.code,
    `Zoho Creator ${status}${
      parsed.code ? ` (code ${parsed.code})` : ""
    } for ${method} ${path}: ${parsed.description}`,
  );
}

export interface RequestOptions {
  method?: string;
  /** URL query-string parameters. Falsy/undefined values are dropped. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON-serialized as the request body. */
  body?: unknown;
  /** `multipart/form-data` body (Upload File's `file` field). */
  form?: FormData;
  /**
   * Extra request headers — `environment`/`demo_user_name`, documented on every
   * data/meta endpoint to target a development/stage form instead of production.
   * Falsy/undefined values are dropped.
   */
  headers?: Record<string, string | undefined>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes
 * every request through the auth `sign` hook, which stamps `Zoho-oauthtoken`.
 */
export class ZohoCreatorClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  /** For every JSON-enveloped endpoint — everything except Download File. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      if (value !== undefined && value !== "") headers[key] = value;
    }
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw formatCreatorError(res.status, init.method ?? "GET", url.pathname, text);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * For Download File, which streams the file's own bytes back rather than the
   * standard JSON envelope. A *failure* still comes back as the standard
   * `{"code":N,"description":"..."}` JSON error envelope, so that path is parsed
   * the normal way.
   */
  async requestRaw(
    path: string,
  ): Promise<{ content: string; contentType: string; base64: boolean }> {
    const url = this.buildUrl(path);
    const res = await this.ctx.fetch(url.toString(), { method: "GET" });
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    if (!res.ok) {
      const text = await res.text();
      throw formatCreatorError(res.status, "GET", url.pathname, text);
    }

    if (/^(text\/|application\/(json|xml))/i.test(contentType)) {
      return { content: await res.text(), contentType, base64: false };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { content: btoa(binary), contentType, base64: true };
  }
}

/**
 * Build the `environment`/`demo_user_name` headers documented on every Creator
 * data/meta endpoint (`things-to-know.html`, every action page's own header table)
 * — omitted entirely when `environment` isn't set, since Zoho defaults to
 * production without them.
 */
export function environmentHeaders(
  input: { environment?: string; demoUserName?: string },
): Record<string, string> {
  if (!input.environment) return {};
  const headers: Record<string, string> = { environment: input.environment };
  if (input.demoUserName) headers["demo_user_name"] = input.demoUserName;
  return headers;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a "data"/"columns"-style JSON param into the record object Zoho Creator expects. */
export function parseJsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}

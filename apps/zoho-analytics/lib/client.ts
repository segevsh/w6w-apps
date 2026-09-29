import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Analytics REST API v2 client.
 *
 * Every path, header, query parameter and response shape here was verified
 * on 2026-09-29 against Zoho's own documentation — the live pages under
 * `https://www.zoho.com/analytics/api/v2/` (`prerequisites.html`,
 * `authentication.html` and its five `authentication/*.html` steps,
 * `data-api.html` and its `add-row.html`/`update-row.html`/`delete-row.html`,
 * `bulk-api.html` and its `import-data/new-table.html`/`export-data.html`,
 * `metadata-api/workspace-details.html`, `metadata-api/owned-workspace.html`,
 * `metadata-api/shared-workspace.html`, `user-management-api/
 * get-workspace-users.html`, `sharing-and-collaboration-api/org-admin.html`)
 * — and live probes against every regional API host (see `lib/regions.ts`).
 * Those doc pages are not linked from Zoho's own site navigation (the left
 * menu is client-rendered) and are absent from `zoho.com`'s sitemap, but
 * each one answers `200` with real, endpoint-specific content — verified via
 * the Wayback Machine's URL index, then re-fetched live.
 *
 * ## `ZANALYTICS-ORGID` is a HEADER, not a query parameter — and only some
 * ## calls need it
 *
 * Unlike Zoho Books (`organization_id` as a query param on almost every
 * call) or Zoho Invoice (an organization id header on every call), Zoho
 * Analytics splits the two: the *organization* (a whole Zoho Analytics
 * account) is sent as the `ZANALYTICS-ORGID` request header, but only on
 * calls that act on a specific workspace's rows/users, or list an
 * organization's admins — `GET /workspaces/owned`, `GET /workspaces/shared`
 * and `GET /workspaces/<id>` (the discovery/detail calls) take **no** org
 * header at all, since a workspace id already identifies which organization
 * it belongs to. `organizationIdFrom` below mirrors `zohobooks`'s
 * `organizationIdFrom`: an optional per-action param, falling back to the id
 * `afterConnect` records on the connection (see `auth/oauth2.ts`), so the
 * common single-organization case needs nothing typed in.
 *
 * ## `CONFIG` carries the request body — even on a POST/PUT/DELETE
 *
 * Every documented data-mutating call (`Add Row`, `Update Row`, `Delete
 * Row`, `Export Data`, `Import Data`) takes its parameters as a single JSON
 * object, URL-encoded into a `CONFIG` query-string parameter — never a JSON
 * request body. The one exception is `Import Data`, which is
 * `multipart/form-data` (a `FILE` field) with `CONFIG` still riding the
 * query string alongside it.
 *
 * ## The response envelope names its payload `data`, and errors share the
 * ## same shape
 *
 * A successful response is `{"status":"success","summary":"<human
 * summary>","data":{...}}`; a failure is `{"status":"failure","summary":
 * "<ERROR_CODE_NAME>","data":{"errorCode":N,"errorMessage":"..."}}` —
 * confirmed identically across `data-api/error-codes.html`,
 * `bulk-api/error-codes.html`, and this app's own live probes (an
 * unauthenticated `GET /workspaces/owned` answers `400
 * {"status":"failure","summary":"INVALID_TICKET","data":{"errorCode":8518,
 * ...}}`; the same call with a syntactically-plausible but dead token
 * answers `401 {"status":"failure","summary":"INVALID_OAUTHTOKEN","data":
 * {"errorCode":8535,...}}` — two different problems worth telling apart in
 * `auth/oauth2.ts`'s `test` hook, the same way `zohobooks` tells its own two
 * codes apart).
 *
 * `Export Data` (`bulk-api/export-data.html`) is the one endpoint that does
 * NOT answer this envelope on success — it streams the view's data back in
 * whatever `responseFormat` was requested (csv/json/xml/html as text,
 * xls/pdf/image as binary), so it goes through {@link requestRaw} instead.
 */

/** Every documented Analytics v2 endpoint hangs off this path segment. */
export const API_PREFIX = "/restapi/v2";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts` for why there is no single `oauth2` method with a
 * data-centre field). Falls back to the US host only for a Connection that
 * predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/**
 * The Zoho Analytics organization this call should act on — sent as the
 * `ZANALYTICS-ORGID` header by {@link ZohoAnalyticsClient.request}. Optional
 * per-action param, falling back to the id `afterConnect` records on the
 * Connection (see `auth/oauth2.ts`) — the common single-organization case
 * needs nothing typed in. `workspace-list-owned` surfaces every workspace
 * (and its `orgId`) available when a caller genuinely has more than one
 * organization.
 */
export function organizationIdFrom(
  input: { organizationId?: string | number },
  ctx: HookContext,
): string {
  const fromInput = input.organizationId;
  if (fromInput !== undefined && fromInput !== null && String(fromInput).trim() !== "") {
    return String(fromInput).trim();
  }
  const display = (ctx.connection?.display ?? {}) as { organizationId?: string };
  if (display.organizationId) return display.organizationId;
  throw new Error(
    "No `organizationId` was provided and none is recorded on this connection. Run List " +
      "Owned Workspaces and pass one explicitly.",
  );
}

export interface RequestOptions {
  method?: string;
  /** JSON-encoded into the `CONFIG` query parameter — see the module doc. */
  config?: Record<string, unknown>;
  /** Sent as the `ZANALYTICS-ORGID` header when present. */
  organizationId?: string;
  /** `multipart/form-data` body (Import Data's `FILE` field). */
  form?: FormData;
}

interface AnalyticsErrorBody {
  status?: string;
  summary?: string;
  data?: { errorCode?: number; errorMessage?: string };
}

/**
 * Turn a Zoho Analytics error response into one actionable line. `summary`
 * is the stable machine token Zoho documents per error family
 * (`INVALID_TICKET`, `INVALID_OAUTHTOKEN`, `META_DBOBJECT_NAME_DUPLICATED`,
 * ...); `data.errorCode`/`data.errorMessage` carry the numeric code and the
 * human-readable detail.
 */
export function formatAnalyticsError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AnalyticsErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as AnalyticsErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.data?.errorMessage) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Analytics ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Analytics ${status}${
    parsed.summary
      ? ` (${parsed.summary}${parsed.data.errorCode ? ` / ${parsed.data.errorCode}` : ""})`
      : ""
  } for ${method} ${path}: ${parsed.data.errorMessage}`;
}

/** The envelope every non-Export-Data Analytics v2 response shares. */
export interface AnalyticsEnvelope<T = unknown> {
  status: string;
  summary: string;
  data: T;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoAnalyticsClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  private buildUrl(path: string, config?: Record<string, unknown>): URL {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    if (config !== undefined) url.searchParams.set("CONFIG", JSON.stringify(config));
    return url;
  }

  private headers(organizationId?: string): Record<string, string> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (organizationId) headers["ZANALYTICS-ORGID"] = organizationId;
    return headers;
  }

  /** For the JSON-enveloped endpoints — everything except Export Data. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.config);
    const headers = this.headers(options.organizationId);
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) init.body = options.form;

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatAnalyticsError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    const body = JSON.parse(text) as AnalyticsEnvelope<T>;
    return body.data;
  }

  /**
   * For `Export Data`, which streams the view's own data back — CSV/JSON/
   * XML/HTML as text, XLS/PDF/image as binary (base64-encoded here since a
   * hook's return value must be JSON-serializable). A *failure* still comes
   * back as the standard JSON error envelope, so that path is parsed the
   * normal way.
   */
  async requestRaw(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ content: string; contentType: string; base64: boolean }> {
    const url = this.buildUrl(path, options.config);
    const headers = this.headers(options.organizationId);
    const res = await this.ctx.fetch(url.toString(), { method: options.method ?? "GET", headers });
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatAnalyticsError(res.status, "GET", url.pathname, text));
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

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a "Columns"/"Fields" JSON param into the record body Zoho Analytics expects. */
export function parseJsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of column -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of column -> value.`);
  }
  return parsed as Record<string, unknown>;
}

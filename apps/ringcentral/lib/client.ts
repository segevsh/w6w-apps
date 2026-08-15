import type { HookContext } from "@w6w/types";

/**
 * RingCentral Platform API (`platform.ringcentral.com/restapi/v1.0`) REST client.
 *
 * Verified on 2026-08-15 against RingCentral's own machine-readable OpenAPI 3.1
 * document (`netstorage.ringcentral.com/dpw/api-reference/specs/rc-platform.yml`,
 * 1,538,792 bytes) plus live probes against `platform.ringcentral.com` and
 * `status.ringcentral.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## One host, one prefix
 *
 * There is exactly one production host, `https://platform.ringcentral.com`
 * (RingCentral also runs a separate sandbox host, `platform.devtest.ringcentral.com`,
 * for developer testing accounts, but this app targets production only — see the
 * README). Every documented path carries the `/restapi/v1.0` prefix.
 *
 * ## `~` addresses "the connection's own"
 *
 * `accountId` and `extensionId` path segments both accept the literal string
 * `"~"`, meaning "the account/extension associated with the current
 * authorization session" — the vendor's own default for both parameters. Every
 * action here defaults to `"~"` and only needs a real id for cross-extension
 * reads an admin-scoped connection is entitled to (e.g. reading another user's
 * call log).
 *
 * ## The error envelope, and why it is read from the wire and not just the schema
 *
 * The OpenAPI document's `ApiError` schema only requires `errorCode` and
 * `message`, but a live unauthenticated probe against
 * `GET /restapi/v1.0/account/~/extension/~` on 2026-08-15 shows the real shape
 * carries both a top-level `errorCode`/`message` AND a nested `errors[]` array
 * with per-item detail:
 *
 * ```json
 * {
 *   "errorCode": "TokenInvalid",
 *   "message": "OAuth token is invalid",
 *   "errors": [{ "errorCode": "OAU-149", "message": "OAuth token is invalid" }]
 * }
 * ```
 *
 * {@link formatRcError} reads the top-level fields (present on every response
 * observed) and appends the nested detail when it says something the top level
 * does not.
 *
 * ## Query-parameter arrays are repeated keys, not comma-joined
 *
 * Multi-valued filters (`status`, `type`, `direction`, `messageType`, …) are
 * documented `style: "form", explode: true` — repeat the key once per value
 * (`status=Enabled&status=Disabled`), unlike Apify's comma-joined convention.
 * {@link appendQuery} implements that.
 */

/** The one production API origin. */
export const API_BASE = "https://platform.ringcentral.com";

/** Every REST endpoint in this app carries this prefix. */
export const API_PREFIX = "/restapi/v1.0";

export const OAUTH_AUTHORIZE_URL = `${API_BASE}/restapi/oauth/authorize`;
export const OAUTH_TOKEN_URL = `${API_BASE}/restapi/oauth/token`;
export const OAUTH_REVOKE_URL = `${API_BASE}/restapi/oauth/revoke`;

/**
 * `GET /restapi/v1.0/account/~/extension/~` — the credential-liveness probe
 * shared by both auth methods' `test`/`afterConnect` hooks.
 *
 * Chosen by reading the response schema rather than by its name: it requires a
 * credential (unauthenticated it answers `401 AGW-401 "Authorization header is
 * not specified"`; with a syntactically plausible but rejected token it answers
 * `401 TokenInvalid`, both observed live on 2026-08-15), it needs only the
 * `ReadAccounts` app permission — the same permission every read action in this
 * app already needs — and its response (`GetExtensionInfoResponse`) carries no
 * secret: no SIP credentials, no device provisioning data. Those live behind
 * `extension/{id}/device/{id}/sip-info`, which this app never calls.
 */
export const WHOAMI_PATH = `${API_PREFIX}/account/~/extension/~`;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The `{uri, records, navigation, paging}` envelope every list endpoint in this app answers. */
export interface RcListPage<T> {
  uri?: string;
  records: T[];
  navigation?: {
    firstPage?: { uri?: string };
    nextPage?: { uri?: string };
    previousPage?: { uri?: string };
    lastPage?: { uri?: string };
  };
  paging?: {
    page?: number;
    perPage?: number;
    totalPages?: number;
    totalElements?: number;
  };
}

interface RcErrorBody {
  errorCode?: string;
  message?: string;
  errors?: Array<{ errorCode?: string; message?: string; parameterName?: string }>;
}

/** Keep an error message readable — a validation body can list several parameter errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn RingCentral's error body into one actionable line.
 *
 * The top-level `errorCode` (`TokenInvalid`, `AGW-401`, `CMN-101`, …) is kept
 * because it is what RingCentral's own troubleshooting guides are written
 * against — a flattened "HTTP 403" loses the difference between a bad token and
 * a permission the connected extension simply does not have. The nested
 * `errors[]` detail is appended only when it adds information (more than one
 * entry, or a `parameterName` naming which field was rejected).
 */
export function formatRcError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: RcErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as RcErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.errorCode && !parsed.message)) {
    return `RingCentral ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `RingCentral ${status} ${parsed.errorCode ?? "error"} for ${method} ${path}`,
    parsed.message,
  ];
  const detail = parsed.errors ?? [];
  if (detail.length > 1 || detail.some((e) => e.parameterName)) {
    parts.push(
      detail
        .map((e) => [e.parameterName, e.errorCode, e.message].filter(Boolean).join(" "))
        .join("; "),
    );
  }
  return truncate(parts.filter(Boolean).join(": "), 1200);
}

/**
 * Append one query parameter, repeating the key for each array element rather
 * than comma-joining — the `style: "form", explode: true` convention every
 * multi-valued filter in this API documents.
 */
export function appendQuery(url: URL, key: string, value: QueryValue): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.append(key, String(v));
    }
    return;
  }
  url.searchParams.append(key, String(value));
}

/**
 * Path-escape an `accountId`/`extensionId` path segment.
 *
 * `encodeURIComponent` leaves `~` unescaped (it is an RFC 3986 unreserved
 * character), which is exactly what is needed — RingCentral's `~` shorthand
 * must survive on the wire. Empty input falls back to `~`, the vendor's own
 * documented default for both of these parameters specifically (see
 * `AccountId`/`ExtensionId` in the OpenAPI document's `components.parameters`).
 */
export function encodeId(id: string | undefined | null): string {
  const trimmed = (id ?? "").trim();
  return encodeURIComponent(trimmed || "~");
}

/**
 * Path-escape any other resource id (`messageId`, `callRecordId`,
 * `ringoutId`, …). Unlike {@link encodeId}, empty input is NOT defaulted to
 * `"~"` — none of these ids carry a "my own" shorthand, so an empty value
 * would silently address the wrong resource rather than a sensible default.
 */
export function encodeSegment(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Normalise a comma-separated or array `to` field into a clean list. */
export function toList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  const items = Array.isArray(v) ? v : v.split(",");
  return items.map((s) => String(s).trim()).filter(Boolean);
}

/** Render a boolean the way this API's optional flags are documented — present only when `true`. */
export function flag(v: boolean | undefined): boolean | undefined {
  return v === true ? true : undefined;
}

export class RingCentralClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      appendQuery(url, k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatRcError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

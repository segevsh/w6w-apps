import type { HookContext } from "@w6w/types";

/**
 * Parseur REST client (`api.parseur.com`).
 *
 * Everything in this module was verified on 2026-09-15 against Parseur's own
 * machine-readable OpenAPI 3.1 document (`https://api.parseur.com/openapi.json`,
 * 120,307 bytes, `info.title` "Parseur", 21 paths / 29 operations), the
 * hand-written guides at `developer.parseur.com` (Authentication, Upload
 * emails and documents, Pagination/Searching/Sorting, Rate limits), and live
 * probes against `api.parseur.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, no version prefix
 *
 * The OpenAPI document declares `servers: []` (relative paths only); every
 * live example and every guide anchors on `https://api.parseur.com`, and no
 * path in the document carries a version segment. Confirmed live: `GET /`
 * (the API root) answers `{"document": "...", "parser": "..."}`.
 *
 * ## Finding: the OpenAPI security scheme is stale — do not send `Token `
 *
 * `components.securitySchemes.TokenAuth.description` says
 * "Use header: Authorization: Token YOUR_API_KEY". The current
 * `developer.parseur.com/authentication.md` guide (fetched the same day)
 * explicitly supersedes that: *"In previous versions of this documentation we
 * recommended to prefix your API key with the string literal `Token`... While
 * prefixing your API key with `Token` still works, it is not required any
 * longer."* This app follows the current guide and sends the bare key —
 * `Authorization: <key>`, no prefix — because that is the documented-current
 * behaviour, not the stale generated description.
 *
 * ## Finding: no envelope, except for lists
 *
 * Unlike some parsing APIs, a single-resource response (a Parser, Document,
 * Template, Webhook, ExportConfig) is the object itself — there is no
 * `{"data": ...}` wrapper to unwrap. The **only** structural envelope is
 * pagination: every list endpoint answers
 * `{count, current, total, results: [...]}` (documented in
 * `pagination-searching-sorting.md` and confirmed against every list path's
 * schema in the OpenAPI document). `count` is the number of items on *this*
 * page and `total` is the number of *pages*, not the number of items overall
 * — reading `count` as a grand total under-reports by a factor of `total`.
 *
 * ## Finding: two operations answer an async "please wait", not the result
 *
 * `POST /document/{id}/process` (reprocess) answers
 * `{"notification_set": {"info": ["Document is being processed. Please
 * wait."]}}` — never the reprocessed Document. `DELETE /parser/{id}` answers
 * the same shape with `"Mailbox is being deleted. This can take a while."`.
 * Both are asynchronous operations that only ever return an acknowledgement;
 * polling `document-get` / `mailbox-list` afterwards is the only way to see
 * the outcome. The upload guide states this for the whole API: *"a successful
 * response means the document was received, not that the document was
 * successfully processed."*
 *
 * ## Finding: uploads return an opaque `DocumentID`, which is NOT the `id`
 *
 * `POST /parser/{id}/upload` and the response shape both call the identifier
 * `DocumentID`, a hex string (e.g. `"1e2e34cba5c678a9012f3e456c789a0f"`) —
 * quite unlike the numeric `id` every other Document read/write uses. The
 * vendor's own guide says to use it via the *DocumentID Metadata field* to
 * correlate later, not as a literal path parameter for `GET /document/{id}`.
 * This app returns it verbatim and does not pretend the two are
 * interchangeable.
 *
 * ## Finding: sending an email/text document requires the mailbox's OWN address
 *
 * `POST /email`'s `recipient` (or `to`/`cc`/`bcc`) must contain the target
 * mailbox's own inbound address — `{email_prefix}@{email_domain}`, where both
 * halves come from `GET /parser/{id}` (`email_prefix`) and `GET /bootstrap`
 * (`email_domain`, e.g. `in.parseur.com`). Posting a document to an arbitrary
 * `recipient` address does not route it anywhere; Parseur's own guide states
 * "your mailbox address must appear in at least one of recipient, to, cc, or
 * bcc."
 *
 * ## Finding: no metered-usage endpoint is reachable
 *
 * The OpenAPI document declares an `Account` schema with real billing/quota
 * fields (`current_period`, `monthly_processed_document_max`, ...) — but
 * **no path in the document references it**. There is no `/account` or
 * `/me` operation of any kind, so plan headroom cannot be read via this API
 * at all; see `health/quota.ts`.
 *
 * ## Errors
 *
 * A 403 auth failure is always `{"non_field_errors": "Not authenticated"}`
 * (no credential reached the request) or
 * `{"non_field_errors": "Authentication failed"}` (a credential arrived but
 * was rejected) — both confirmed live. Other 4xx bodies mix a top-level
 * `non_field_errors` string with, on some 400s, ordinary DRF per-field arrays
 * (`{"name": ["This field may not be blank."]}`); {@link formatParseurError}
 * reads either shape.
 *
 * ## Rate limits
 *
 * 5 requests/second per IP with a burst allowance of 20 (`api-rate-limits.md`).
 * Exceeding it answers `429 Too Many Requests`. No `X-RateLimit-*` (or any
 * other) rate-limit header was observed on a live 403 response — see
 * `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no server or version prefix. */
export const API_BASE = "https://api.parseur.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** A pre-built `FormData` (multipart upload). Content type (with boundary) is left to `fetch`. */
  form?: FormData;
  headers?: Record<string, string>;
}

/** Parseur's pagination envelope, returned by every list endpoint. */
export interface ParseurListPage<T> {
  /** Items on THIS page, not the grand total — see the module doc. */
  count: number;
  /** Current page number (1-based). */
  current: number;
  /** Total number of PAGES, not items. */
  total: number;
  results: T[];
}

interface ParseurErrorBody {
  non_field_errors?: string | string[];
  detail?: string;
  [field: string]: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Path-escape a caller-supplied resource id. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Normalise a `multiselect` param into a comma-joinable list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Parseur's error body into one actionable line.
 *
 * `non_field_errors` carries the headline (auth failures, "no Parser matches
 * the given query", the mailbox-address conflict); ordinary DRF per-field
 * validation errors (`{"name": ["..."]}`) are appended when present. Neither
 * shape is assumed exclusive of the other.
 */
export function formatParseurError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ParseurErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ParseurErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || typeof parsed !== "object") {
    return `Parseur ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const messages: string[] = [];
  if (parsed.non_field_errors) {
    messages.push(
      Array.isArray(parsed.non_field_errors)
        ? parsed.non_field_errors.join("; ")
        : String(parsed.non_field_errors),
    );
  }
  if (typeof parsed.detail === "string") messages.push(parsed.detail);
  for (const [field, value] of Object.entries(parsed)) {
    if (field === "non_field_errors" || field === "detail") continue;
    if (Array.isArray(value)) messages.push(`${field}: ${value.join(", ")}`);
    else if (typeof value === "string") messages.push(`${field}: ${value}`);
  }

  const parts = [
    `Parseur ${status} for ${method} ${path}`,
    messages.length > 0 ? messages.join("; ") : truncate(raw),
    status === 429
      ? "Parseur limits requests to 5/second per IP (burst 20); retry with exponential backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class ParseurClient {
  constructor(private ctx: HookContext) {}

  /**
   * Fetch, decode, and throw a formatted error on a non-2xx response.
   *
   * Most Parseur responses are JSON, but a few documented ones are not
   * (`DELETE /webhook/{id}` answers `text/html`, and the three `copy`
   * operations document no response body at all) — an unparsable success body
   * is returned as `undefined` rather than throwing, since a caller that only
   * needs the status code (see the delete/copy actions) must not fail on it.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, String(item));
          }
        }
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      // Leave content-type to `fetch` — it must carry the multipart boundary.
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatParseurError(res.status, init.method ?? "GET", url.pathname, detail));
    }

    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  /** Status code only — used by the delete/copy actions whose body is undocumented or absent. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatParseurError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res.status;
  }
}

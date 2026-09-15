import type { HookContext } from "@w6w/types";

/**
 * Softr REST clients — **two** unrelated hosts, one shared credential.
 *
 * Verified 2026-09-15 against Softr's own Mintlify documentation
 * (`docs.softr.io/softr-api/...`): the OpenAPI-generated "Softr Database API"
 * reference (`docs.softr.io/softr-api/softr-database-api/*`, `openapi.yaml`,
 * production server `https://tables-api.softr.io/api/v1`) and the prose
 * "API Setup and Endpoints" page
 * (`docs.softr.io/softr-api/api-setup-and-endpoints`) for the Studio Users API
 * (`https://studio-api.softr.io/v1/api`). Both were reached live (HTTP 200) on
 * that date; nothing here came from a third-party integration directory.
 *
 * ## This is NOT a proxy to Airtable/Google Sheets
 *
 * Softr apps can be *built on top of* an external Airtable base or Google
 * Sheet, but Softr's own API documents no endpoint that reads or writes such a
 * connected external source. The only records API Softr publishes is for its
 * **own** native "Softr Database" — a first-party multi-table store with its
 * own field/view model — reached over `tables-api.softr.io`. An app relying on
 * Airtable/Sheets underneath has no Softr-side records API at all; use the
 * Airtable or Google Sheets app directly against that source instead.
 *
 * ## Two hosts, one Personal Access Token, two different auth shapes
 *
 *  - **Database API** (`tables-api.softr.io`) — the token is passed in the
 *    `Softr-Api-Key` header and is scoped to one or more **workspaces**; the
 *    database/table being addressed is named in the URL path.
 *  - **Studio Users API** (`studio-api.softr.io`) — the *same* token, in the
 *    *same* `Softr-Api-Key` header, but the target **app** is selected by a
 *    `Softr-Domain` header (the published app's domain or subdomain) rather
 *    than by a path segment. `Softr-Domain` is not secret — it is exactly the
 *    app's public hostname — so it is set by each action, not by `sign`.
 *
 * Both hosts are declared in `w6w.network.allow`; `sign` (see `auth/api-key.ts`)
 * stamps `Softr-Api-Key` on every outbound request regardless of which client
 * issued it, so neither client sets that header itself.
 *
 * ## The Database API's response envelope
 *
 * Every JSON response wraps its payload in `{"data": …}`; list endpoints add a
 * sibling `"metadata": {offset, limit, total}`. A `DELETE` answers `204` with
 * no body. Errors — documented once, generically, rather than per endpoint —
 * are `{"message", "errorCode", "details"}` with a 4xx/5xx status; Softr's own
 * reference does not enumerate specific `errorCode` values, so this app treats
 * `message`/`errorCode` as free text to surface verbatim rather than branching
 * on a guessed vocabulary.
 *
 * ## The Studio Users API has no documented response schema
 *
 * The "API Setup and Endpoints" page shows a request for each endpoint (host,
 * method, path, headers, body) but not one single example response body — no
 * `200` sample and no error sample. That is a real, load-bearing gap: this
 * app's Users actions read back the raw parsed JSON (or `null` for an empty
 * `204`/`200`-with-no-body reply) rather than asserting field names Softr has
 * never published; the exception is a rejected request, whose status code
 * alone drives failure, since no body shape is documented to be safer to
 * assume than "absent".
 *
 * ## Rate limits — ceilings only, no headroom signal
 *
 * The Database API documents a flat **40 requests/second for reads** (`GET`,
 * `POST /search`) and **30 requests/second for writes** (`POST`, `PUT`,
 * `PATCH`, `DELETE`), enforced per token, answering `429` over the limit. No
 * response header carrying a remaining count or reset time is documented for
 * either host. See `health/quota.ts` for what that means for this app's
 * headroom reporting.
 */

/** Softr Database API — the only server the OpenAPI document declares. */
export const TABLES_API_BASE = "https://tables-api.softr.io/api/v1";

/** Softr Studio Users API — a separate host, from the prose setup guide. */
export const STUDIO_API_BASE = "https://studio-api.softr.io/v1/api";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** The Database API's generic error envelope — see the module doc above. */
export interface SoftrErrorBody {
  message?: string;
  errorCode?: string;
  details?: unknown;
}

/** The Database API's list envelope. */
export interface SoftrListPage<T> {
  data: T[];
  metadata?: { offset?: number; limit?: number; total?: number };
}

/** Normalise a comma-separated or array input into a list, dropping blanks. Empty input → `undefined`. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Path-escape a caller-supplied resource id (or email, for the Studio Users API). */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a validation `details` blob can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a Softr Database API failure as one actionable line.
 *
 * The vendor's own error shape carries `message` and `errorCode`; both are
 * kept (when present) rather than flattened to a bare "HTTP 404", because
 * Softr's reference does not enumerate the `errorCode` vocabulary and a caller
 * debugging a specific integration needs the vendor's own words.
 */
export function formatSoftrError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SoftrErrorBody | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as SoftrErrorBody) : null;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.message && !parsed.errorCode)) {
    return `Softr ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }

  const parts = [
    `Softr ${status}${parsed.errorCode ? ` ${parsed.errorCode}` : ""} for ${method} ${path}`,
    parsed.message,
    status === 429
      ? "Softr rate-limits per token (40 reads/s, 30 writes/s); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/** A record from a Softr Database table — the one entity shape both clients read/write. */
export interface SoftrRecord {
  id: string;
  tableId: string;
  fields: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** `GET /databases/{databaseId}/tables/{tableId}/records` query shape. */
export interface RecordListQuery {
  offset?: number;
  limit?: number;
  fieldNames?: boolean;
  viewId?: string;
}

/** Softr's `Search Records` filter/sort/paging body — see `lib/params.ts` for the field grammar. */
export interface RecordSearchBody {
  filter?: unknown;
  sorting?: unknown;
  paging?: { offset?: number; limit?: number };
}

/** Thin REST client for `tables-api.softr.io` — the Softr Database API. */
export class TablesClient {
  constructor(private ctx: HookContext) {}

  private async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = new URL(`${TABLES_API_BASE}${path}`);
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
      throw new Error(formatSoftrError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }

  /** Parse a `{"data": …}` response and return the unwrapped payload. */
  async data<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    const body = JSON.parse(text) as { data?: T };
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** Parse a `{"data": [...], "metadata": {...}}` list response without discarding `metadata`. */
  async list<T>(path: string, options: RequestOptions = {}): Promise<SoftrListPage<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return { data: [] };
    return JSON.parse(text) as SoftrListPage<T>;
  }

  /** `DELETE` — the vendor answers `204` with no body. */
  async remove(path: string, options: RequestOptions = {}): Promise<void> {
    await this.send(path, { ...options, method: "DELETE" });
  }
}

/**
 * Thin REST client for `studio-api.softr.io` — the Studio Users API.
 *
 * `domain` is sent as the `Softr-Domain` header on every call. It is not
 * secret — it is the target Softr app's own public hostname — so it travels
 * as an ordinary per-call header rather than through `sign`.
 */
export class StudioClient {
  constructor(private ctx: HookContext, private domain: string) {}

  /**
   * Issue a request and return the parsed JSON body, or `null` when the
   * response has no body. No response schema is documented for this API (see
   * the module doc above), so the raw parsed value is returned verbatim.
   */
  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = new URL(`${STUDIO_API_BASE}${path}`);
    const headers: Record<string, string> = {
      accept: "application/json",
      "softr-domain": this.domain,
      ...options.headers,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatSoftrError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

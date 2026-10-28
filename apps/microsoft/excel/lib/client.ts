/**
 * Microsoft Graph client for the Excel workbook API — the whole vendor surface
 * this App talks to.
 *
 * Everything here was checked against the Microsoft Graph v1.0 reference:
 * https://learn.microsoft.com/en-us/graph/api/resources/excel
 *
 * Four Excel-specific things this file exists to absorb:
 *
 *  1. **A workbook is addressed through the Drive API, not a workbook API.**
 *     There is no `/workbooks/{id}` collection. Every Excel resource hangs off a
 *     driveItem, in one of exactly two documented forms:
 *
 *         /me/drive/items/{item-id}/workbook/...
 *         /me/drive/root:/{item-path}:/workbook/...
 *
 *     The `:` characters in the second form are structural delimiters, so the
 *     path is encoded segment-by-segment and the delimiters are left alone.
 *     `workbookPath()` is the single place that decision is made.
 *
 *  2. **The session header.** Excel calls run in one of three modes — persistent
 *     session, non-persistent session, or sessionless — selected entirely by the
 *     `workbook-session-id` request header. See `sessionHeaders()` and the
 *     README; getting this wrong is the classic Excel-API mistake.
 *
 *  3. **Identifiers need encoding, ranges need OData quoting.** Worksheet and
 *     chart ids are GUIDs wrapped in literal `{`/`}` which the docs explicitly
 *     require URL-encoding. Range addresses ride inside an OData function
 *     parameter (`range(address='Sheet1!A1:D5')`), where a literal apostrophe is
 *     escaped by doubling it.
 *
 *  4. **The OData envelope.** Collections come back as `{ "value": [...] }`,
 *     never as a bare array. Excel's own collections page with `$top`/`$skip`
 *     rather than a cursor; the Drive search used by List Workbooks pages with
 *     `@odata.nextLink`, an *absolute URL* that already carries every query
 *     parameter and must be replayed verbatim
 *     (https://learn.microsoft.com/en-us/graph/paging).
 *
 * Note there is no `Authorization` header anywhere in this file: the runtime
 * routes every request through the Auth `sign` hook, which is the only code
 * handed the credential.
 */
import type { HookContext } from "@w6w/types";

/** Graph's stable production endpoint. `beta` is deliberately not used. */
export const API_URL = "https://graph.microsoft.com/v1.0";

/** The request header that selects the Excel session mode. */
export const SESSION_HEADER = "workbook-session-id";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query parameters. OData names (`$select`, `$top`, …) are passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** JSON object → JSON-encoded body. `undefined` → no body at all. */
  body?: unknown;
  /** Extra request headers (in practice, `workbook-session-id`). */
  headers?: Record<string, string>;
}

/** The shape of every Graph collection response. */
export interface GraphList<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

/** What the list actions return: one or more pages, plus the cursor to continue. */
export interface PagedResult<T> {
  value: T[];
  /**
   * Present when Graph has more results. Feed it back as the `nextLink` param
   * on the next call — it is a complete URL, not an opaque token. Only the
   * Drive search collection emits one; the Excel collections page with
   * `$top`/`$skip` instead.
   */
  nextLink?: string;
  /** How many HTTP requests were actually made. */
  pages: number;
}

/** Graph's error envelope: `{ "error": { "code": "...", "message": "..." } }`. */
interface GraphError {
  error?: { code?: string; message?: string };
}

// ------------------------------------------------------- workbook addressing --

/**
 * How the caller pointed at a workbook. Exactly one of the two must be set —
 * they are the two forms Graph documents, and there is no third.
 */
export interface WorkbookRef {
  /** driveItem id, e.g. `01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN`. */
  itemId?: string;
  /** Path relative to the drive root, e.g. `Reports/Q3.xlsx`. */
  itemPath?: string;
}

/**
 * Percent-encode a drive-relative file path **per segment**.
 *
 * `encodeURIComponent` on the whole string would eat the `/` separators; the
 * `:` delimiters that bracket the path in the addressing form are structural
 * and are added by the caller, never encoded.
 */
export function encodeItemPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

/**
 * Build the `/…/workbook` prefix every Excel path hangs off.
 *
 * https://learn.microsoft.com/en-us/graph/api/resources/excel
 *
 * Both documented forms are supported; supplying both, or neither, is a caller
 * error rather than a silent preference, because the two can disagree and
 * quietly operating on the wrong workbook is the worst outcome available.
 */
export function workbookPath(ref: WorkbookRef): string {
  const itemId = ref.itemId?.trim();
  const itemPath = ref.itemPath?.trim();

  if (itemId && itemPath) {
    throw new Error(
      "Address the workbook by Item ID or by File path, not both — they can point at different files.",
    );
  }
  if (itemId) return `/me/drive/items/${encodeURIComponent(itemId)}/workbook`;
  if (itemPath) {
    const encoded = encodeItemPath(itemPath);
    if (!encoded) throw new Error("File path is empty after trimming its separators.");
    return `/me/drive/root:/${encoded}:/workbook`;
  }
  throw new Error(
    "A workbook must be addressed: set either Item ID or File path (e.g. `Reports/Q3.xlsx`).",
  );
}

/**
 * Encode a worksheet / table / chart identifier for use as a path segment.
 *
 * Worksheet and chart ids are GUIDs wrapped in literal braces
 * (`{00000000-0001-0000-0000-000000000000}`); the reference is explicit that
 * those braces must be URL-encoded or the request fails. Names are accepted in
 * the same position (`{id|name}`) and are encoded the same way.
 */
export function segment(idOrName: string): string {
  const value = (idOrName ?? "").trim();
  if (!value) throw new Error("An empty worksheet/table/chart identifier was supplied.");
  return encodeURIComponent(value);
}

/** Escape a string for an OData function parameter: a literal `'` is doubled. */
export function odataString(value: string): string {
  return value.replaceAll("'", "''");
}

/**
 * The `range(address='…')` path fragment, or the bare `/range` form.
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-range — `address` is
 * optional, and omitting it returns the entire worksheet range.
 */
export function rangeSegment(address?: string): string {
  const value = address?.trim();
  return value ? `/range(address='${odataString(value)}')` : "/range";
}

/**
 * Build the `workbook-session-id` header, or nothing.
 *
 * Omitting the header is legal — Graph calls it "sessionless" mode — and in
 * that mode changes are persisted to the file. The header is what selects
 * between a persistent session (changes saved) and a non-persistent one
 * (changes discarded when the session expires); which of those a given id means
 * was fixed when the session was created, not here.
 */
export function sessionHeaders(sessionId?: string): Record<string, string> | undefined {
  const id = sessionId?.trim();
  return id ? { [SESSION_HEADER]: id } : undefined;
}

// -------------------------------------------------------------------- client --

/** Thin wrapper over `ctx.fetch`. */
export class GraphClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute URL. A path already starting with `http` is used as-is
   * (that is how `@odata.nextLink` is replayed). */
  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  private async fire(path: string, options: RequestOptions): Promise<Response> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    if (!res.ok) throw new Error(await describeFailure(res, method, url));
    return res;
  }

  /** Perform a request and decode the JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.fire(path, options);
    // 202/204 carry no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 202 || res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /**
   * Perform a request whose only meaningful result is "the service accepted
   * it" — Graph's `204 No Content` endpoints (closeSession, delete worksheet,
   * clear range).
   */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /** Fetch exactly one page of a collection. */
  async page<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const body = await this.request<GraphList<T>>(path, options);
    return {
      value: body?.value ?? [],
      nextLink: body?.["@odata.nextLink"],
      pages: 1,
    };
  }

  /**
   * Walk `@odata.nextLink` up to `maxPages` requests.
   *
   * Bounded on purpose: a drive is unbounded, an action's runtime is not, and a
   * silent infinite walk is the failure mode this replaces. When the cap is hit
   * the surviving `nextLink` is returned so the caller can resume.
   */
  async collect<T>(
    path: string,
    options: RequestOptions = {},
    maxPages = 10,
  ): Promise<PagedResult<T>> {
    const limit = Math.max(1, Math.floor(maxPages));
    const value: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    for (;;) {
      // Only the first request carries `query`; a nextLink already embeds it.
      const body = cursor
        ? await this.request<GraphList<T>>(cursor, { headers: options.headers })
        : await this.request<GraphList<T>>(path, options);
      pages++;
      value.push(...(body?.value ?? []));
      cursor = body?.["@odata.nextLink"];
      if (!cursor || pages >= limit) break;
    }

    return { value, nextLink: cursor, pages };
  }
}

/** Surface Graph's `error.code` / `error.message` when it sends one. */
async function describeFailure(res: Response, method: string, url: URL): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as GraphError;
      const code = parsed.error?.code;
      const message = parsed.error?.message;
      detail = [code, message].filter(Boolean).join(": ") || text;
    } catch {
      detail = text;
    }
  } catch { /* body already consumed or unreadable */ }
  return `Microsoft Graph ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`;
}

// ------------------------------------------------------------------ helpers --

/** Join a repeated param into the comma-separated form OData expects. */
export function odataList(values?: string[]): string | undefined {
  const joined = (values ?? []).map((v) => (v ?? "").trim()).filter(Boolean).join(",");
  return joined || undefined;
}

/** Drop `undefined` entries so a PATCH only ever touches what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

import type { HookContext, Param } from "@w6w/types";

/**
 * Smartsheet API 2.0.
 *
 * ## Where the documentation actually lives (checked 2026-08-03)
 *
 * Two links that are widely cited for this API are both dead ends now:
 *
 *   - `https://smartsheet-platform.github.io/api-docs/` — still returns 200, but
 *     the body is a five-line redirect stub: `<title>Redirecting to
 *     https://smartsheet.redoc.ly/</title>`. Its GitHub repo README says
 *     "Smartsheet API Documentation Has Moved!".
 *   - `https://smartsheet.redoc.ly/` — also still returns 200, and is ALSO
 *     superseded. Its own spec file is titled `(DEPRECATED site)` and its
 *     description reads: "The new Smartsheet API reference documentation site is
 *     located at https://developers.smartsheet.com/api".
 *
 * The live reference is **https://developers.smartsheet.com/api/smartsheet/**
 * (note: `/api/smartsheet/` alone 404s — the entry points are
 * `.../openapi` and `.../introduction`). This app was built from that portal's
 * machine-readable OpenAPI 3.0.3 document, served at
 * <https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml> —
 * 1.6 MB, `application/yaml`, `info.title: "Smartsheet OpenAPI Reference"`.
 * Every path, query parameter, request body and response envelope below was
 * read out of that document rather than recalled.
 *
 * ## Base URL
 *
 * `servers[0].url` is `https://api.smartsheet.com/2.0`, matching the QUICKLINKS
 * block in the spec description ("Base URL: `https://api.smartsheet.com/2.0/`").
 * The spec declares two more regional hosts — `api.smartsheet.eu` and
 * `api.smartsheet.au` (plus a separate Gov endpoint) — which this app does NOT
 * call and does NOT allowlist. Supporting a region would mean widening
 * `w6w.network.allow` to hosts no action reaches today; add them together if a
 * tenant needs one.
 *
 * ## Two response envelopes, not one
 *
 * Paginated collections return `IndexResult`:
 * `{ data, pageNumber, pageSize, totalPages, totalCount }`. Writes return
 * `GenericResult`: `{ message: "SUCCESS" | "PARTIAL_SUCCESS", resultCode, result }`.
 * Search is a THIRD shape — `{ results, totalCount }`, with `results`, not
 * `data`. The children endpoints are a fourth: `{ data, lastKey }`, token-paged
 * rather than page-numbered. Each is typed separately below because conflating
 * them is how a caller ends up reading `data` off a search response forever.
 */
export const API_URL = "https://api.smartsheet.com/2.0";

/** `IndexResult` — the page-numbered collection envelope. */
export interface IndexResult<T = unknown> {
  data: T[];
  pageNumber?: number;
  pageSize?: number | null;
  totalPages?: number;
  totalCount?: number;
}

/** `GenericResult` — what every write returns. `result` is the created/updated object(s). */
export interface GenericResult<T = unknown> {
  message?: "SUCCESS" | "PARTIAL_SUCCESS";
  resultCode?: number;
  result?: T;
  version?: number;
  failedItems?: unknown[];
}

/** `SearchResult` — `results`, NOT `data`. */
export interface SearchResult<T = unknown> {
  results: T[];
  totalCount?: number;
}

/** `PaginatedChildrenResponse` — token-paged via `lastKey`, not `page`/`pageSize`. */
export interface PaginatedChildren<T = unknown> {
  data: T[];
  lastKey?: string;
}

/**
 * A Cell, exactly as Smartsheet models it.
 *
 * **A cell is addressed by `columnId`, never by column title.** The API has no
 * by-name form: `POST/PUT /sheets/{id}/rows` documents each cell object as
 * "`columnId` (required)" plus exactly one of `value`, `formula` or
 * `objectValue`. Column titles are not unique-by-contract and are renamable in
 * the UI, so there is nothing for the API to key on. Resolve titles to ids with
 * the List Columns action and cache them per sheet; this app deliberately
 * refuses to fake a title-keyed path, because such a shim silently writes to the
 * wrong column the moment two columns share a title or one is renamed.
 */
export interface Cell {
  columnId: number;
  value?: string | number | boolean | null;
  formula?: string;
  objectValue?: unknown;
  strict?: boolean;
  hyperlink?: unknown;
  /** Response-only. Present on reads; never sent. */
  displayValue?: string;
  /** Response-only, and only when `include=columnType`. */
  columnType?: string;
}

/** A Row as this app sends it — an id, optional location specifiers, and cells. */
export interface RowWrite {
  id?: number;
  cells?: Cell[];
  toTop?: boolean;
  toBottom?: boolean;
  parentId?: number;
  siblingId?: number;
  above?: boolean;
  indent?: number;
  outdent?: number;
  expanded?: boolean;
  locked?: boolean;
  format?: string;
}

/**
 * Coerce an id to the JSON number Smartsheet requires, refusing silently-wrong
 * conversions.
 *
 * Smartsheet ids are int64 and run to 16 digits — the spec's own examples
 * include `8896508249565060` for a row and `7960873114331012` for a column.
 * `Number.MAX_SAFE_INTEGER` is `9007199254740991`, so those fit, but only just:
 * an id one order of magnitude larger would round on the way through
 * `JSON.stringify` and write to a DIFFERENT column without erroring.
 *
 * Ids therefore travel as STRINGS through every param and every URL path, where
 * no numeric conversion happens at all. This function is the single point where
 * one becomes a number for a request BODY, and it throws rather than round.
 */
export function toId(value: string | number, what: string): number {
  const raw = typeof value === "number" ? value : String(value).trim();
  // `Number("")` and `Number("   ")` are both 0 — a finite integer that would
  // sail through the checks below and address column 0. Reject the empty string
  // before it can become a plausible-looking id.
  if (raw === "") throw new Error(`${what}: "" is not an integer id`);
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`${what}: "${value}" is not an integer id`);
  }
  if (!Number.isSafeInteger(n)) {
    throw new Error(
      `${what}: "${value}" exceeds JavaScript's safe integer range and would be corrupted ` +
        `by rounding. Smartsheet ids are int64; this one cannot be sent losslessly.`,
    );
  }
  return n;
}

/**
 * Build a `Cell[]` from either of the two shapes a workflow author can supply.
 *
 * 1. **A map keyed by column id** — `{"7960873114331012": "In Progress"}`. The
 *    ergonomic form for the common case of "set these values". Keys are the
 *    column ids, because that is the only thing the API accepts.
 * 2. **An array of full Cell objects** — `[{"columnId": 796…, "formula": "=SUM(…)"}]`.
 *    The escape hatch for `formula`, `objectValue`, `hyperlink` and `strict`.
 *
 * Both funnel through `toId`, so a corrupting id fails loudly in either form.
 * A `null` map value is preserved: Smartsheet reads an empty-string/null value
 * as "clear this cell", which is a real instruction and not the same as omitting
 * the cell (which leaves it untouched).
 *
 * **One JavaScript quirk worth naming.** The map form's keys are integer-like
 * strings, and ECMAScript orders those in a plain object by ASCENDING NUMERIC
 * VALUE regardless of how they were written — so `{"4567890123": …,
 * "1234567890": …}` iterates smallest-id-first, not source order. That is
 * harmless here (Smartsheet's `cells` array is a set of `(columnId, value)`
 * pairs and carries no positional meaning) but it does mean the emitted cell
 * order is not the author's order. Anything that genuinely needs a fixed order
 * should use the array form, which preserves it.
 */
export function toCells(input: unknown, what = "cells"): Cell[] {
  if (input === undefined || input === null) return [];

  if (Array.isArray(input)) {
    return input.map((raw, i) => {
      const c = raw as Record<string, unknown>;
      if (c === null || typeof c !== "object") {
        throw new Error(`${what}[${i}]: expected a cell object`);
      }
      if (c.columnId === undefined || c.columnId === null || c.columnId === "") {
        throw new Error(
          `${what}[${i}]: missing columnId. Smartsheet addresses cells by column id, not by ` +
            `column title — use the List Columns action to resolve titles to ids.`,
        );
      }
      const cell: Cell = {
        columnId: toId(c.columnId as string | number, `${what}[${i}].columnId`),
      };
      if ("value" in c) cell.value = c.value as Cell["value"];
      if (c.formula !== undefined) cell.formula = c.formula as string;
      if (c.objectValue !== undefined) cell.objectValue = c.objectValue;
      if (c.strict !== undefined) cell.strict = c.strict as boolean;
      if (c.hyperlink !== undefined) cell.hyperlink = c.hyperlink;
      return cell;
    });
  }

  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).map(([columnId, value]) => ({
      columnId: toId(columnId, `${what} key`),
      value: value as Cell["value"],
    }));
  }

  throw new Error(`${what}: expected an object keyed by column id, or an array of cell objects`);
}

/**
 * The `Param` every action that writes cells reuses, so the columnId rule is
 * stated at the form and not only in a README nobody opens.
 */
export const CELLS_HINT =
  'Either a map of column id → value — `{"7960873114331012": "In Progress"}` — or an array of ' +
  'full cell objects — `[{"columnId": 7960873114331012, "formula": "=SUM(Cost:Cost)"}]`. ' +
  "Smartsheet addresses cells by COLUMN ID, never by column title; get the ids from the List " +
  "Columns action.";

/** Page/pageSize/includeAll, the trio shared by every `IndexResult` endpoint. */
export interface PageInput {
  page?: number;
  pageSize?: number;
  includeAll?: boolean;
}

export function pageQuery(input: PageInput): Record<string, string | number | boolean | undefined> {
  return {
    page: input.page,
    pageSize: input.pageSize,
    // Only sent when true: `includeAll=false` is the default, and Smartsheet
    // documents the flag as mutually exclusive with page/pageSize, so emitting
    // it unconditionally would be noise on every request.
    includeAll: input.includeAll ? true : undefined,
  };
}

export const PAGE_PARAMS: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "Which page to return. Defaults to 1. Asking past the last page returns the last page.",
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    hint: "Items per page. Defaults to 100.",
  },
  {
    key: "includeAll",
    label: "Include all",
    type: "boolean",
    hint: "Return every result without paginating. Mutually exclusive with Page and Page size — " +
      "Smartsheet ignores both when this is set.",
  },
];

/** The `output` fragment every `IndexResult` action reuses. */
export const PAGE_OUTPUT = [
  { key: "data", type: "array" as const, label: "Results" },
  { key: "totalCount", type: "number" as const, label: "Total items in the full result set" },
  { key: "pageNumber", type: "number" as const, label: "Page this response represents" },
  { key: "totalPages", type: "number" as const, label: "Total pages" },
];

/**
 * Join a multiselect value into the comma-separated string Smartsheet's
 * `include` / `exclude` / `columnIds` / `rowIds` params expect.
 *
 * Every one of those is declared in the OpenAPI document as a single
 * `type: string` "comma-separated list" — NOT as a repeated parameter — so
 * `?include=a&include=b` is wrong and `?include=a,b` is right.
 */
export function csv(value: string[] | string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  return parts.length > 0 ? parts.join(",") : undefined;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an `Authorization`
 * header. The runtime routes every request through the auth `sign` hook, which
 * is the only code handed the raw credential. An action that set the header
 * itself would both leak the credential into the network-capable worker and fail
 * the pack auditor.
 */
export class SmartsheetClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) throw new Error(await errorMessage(res, options.method ?? "GET", url.pathname));
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Smartsheet's error body is `{ errorCode, message, refId }` — verified live on
 * 2026-08-03 against `api.smartsheet.com/2.0/users/me` with a bogus token:
 *
 *     { "errorCode": 1002, "message": "Your Access Token is invalid.", "refId": "2j1nqp" }
 *
 * The `refId` is the one thing Smartsheet support asks for, so it is surfaced
 * rather than swallowed. A non-JSON body (a proxy's HTML error page) falls back
 * to raw text.
 */
async function errorMessage(res: Response, method: string, pathname: string): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    const body = JSON.parse(text) as { errorCode?: number; message?: string; refId?: string };
    detail = [
      body.message,
      body.errorCode !== undefined ? `errorCode ${body.errorCode}` : undefined,
      body.refId ? `refId ${body.refId}` : undefined,
    ].filter(Boolean).join(" · ") || text;
  } catch {
    // Body already consumed, unreadable, or not JSON — the status still tells
    // the story, and `detail` stays whatever we managed to read.
  }
  return `Smartsheet ${res.status} ${res.statusText} for ${method} ${pathname}: ${detail}`;
}

/** Drop `undefined` keys so an optional param never blanks a field it did not mention. */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

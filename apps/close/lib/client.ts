import type { HookContext } from "@w6w/types";

/**
 * Close API v1.
 *
 * ## The rename, and why the base URL is what it is
 *
 * Close was founded as **Close.io** and rebranded to **Close.com**. The old
 * developer host still resolves but does not serve: `http://developer.close.io/`
 * returns a **301 Moved Permanently** to `https://developer.close.com/`
 * (verified 2026-08-03). The API host followed the same rename — `api.close.com`
 * is the documented and current one, stated verbatim on Close's own
 * authentication page as "API Base URL: `https://api.close.com/api/v1`" and as
 * the single `servers[0].url` entry in Close's machine-readable OpenAPI document
 * at <https://api.close.com/api/openapi.json>.
 *
 * Only `api.close.com` is on this app's egress allowlist. `api.close.io` is NOT
 * called and NOT allowlisted — there is no reason to depend on a legacy host
 * whose only documented behaviour is to redirect.
 *
 * ## Trailing slashes are load-bearing
 *
 * Every Close path ends in `/` — `/lead/`, `/lead/{id}/`, `/activity/note/`.
 * This is not cosmetic tidiness: Close is a Django application and its router
 * matches the slashed form. Dropping it earns a redirect at best. Every path
 * constant in this app therefore keeps its trailing slash, and the client does
 * not normalise them away.
 */
export const API_URL = "https://api.close.com/api/v1";

/**
 * The offset-paginated list envelope, verbatim from Close's pagination page:
 * "The response contains two fields: `data` containing the list of objects and
 * `has_more`, which indicates if you reached the last page."
 *
 * Note this is NOT the envelope the Advanced Filtering (search) endpoint uses —
 * that one is `{ data, cursor, count? }`. See `SearchResponse` below.
 */
export interface CloseList<T = unknown> {
  data: T[];
  has_more: boolean;
  total_results?: number;
}

/** The Advanced Filtering envelope — cursor-paginated, not offset-paginated. */
export interface SearchResponse<T = unknown> {
  data: T[];
  cursor: string | null;
  count?: { limited?: number; total?: number };
}

/** Query params shared by every offset-paginated list endpoint. */
export interface PageInput {
  skip?: number;
  limit?: number;
  fields?: string;
}

/** Map the shared page inputs onto Close's underscore-prefixed query names. */
export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return {
    _skip: input.skip,
    _limit: input.limit,
    _fields: input.fields,
  };
}

/**
 * The `Param[]` fragment every list action reuses, so paging looks identical
 * everywhere.
 *
 * The deep-pagination warning is Close's own and worth repeating at the form:
 * `_skip` has a per-resource ceiling, so walking a large collection by
 * incrementing it eventually 400s. Close's documented workaround is to narrow
 * the query by a `date_created` range instead.
 */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Results per page (`_limit`). Close defaults to 100; the maximum varies per resource.",
  },
  {
    key: "skip",
    label: "Skip",
    type: "number" as const,
    hint:
      "Results to skip (`_skip`), for pagination. Close caps how far you may skip per resource — " +
      "to walk a large collection, narrow by a `date_created` range rather than skipping deeper.",
  },
  {
    key: "fields",
    label: "Fields",
    type: "string" as const,
    hint:
      "Comma-separated list of fields to return (`_fields`). Use `custom` for all custom fields, " +
      "or `custom.cf_...` identifiers for specific ones.",
  },
];

/** The `output` fragment every offset-paginated list action reuses. */
export const PAGE_OUTPUT = [
  { key: "data", type: "array" as const, label: "Results" },
  { key: "has_more", type: "boolean" as const, label: "Whether another page follows" },
];

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an `Authorization`
 * header. The runtime routes every request through the auth `sign` hook, which
 * is the only code handed the raw credential. An action that set the header
 * itself would both leak the credential into the network-capable worker and
 * fail the pack auditor.
 */
export class CloseClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* body already consumed or unreadable — the status still tells the story */ }
      throw new Error(
        `Close ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Drop keys whose value is `undefined` so a PUT never blanks a field the caller
 * simply did not mention.
 *
 * This matters more on Close than on most APIs: its PUTs are documented as
 * PATCHes ("PUT requests function as patches"), so an explicit `null` is a
 * meaningful instruction to clear a field while `undefined` means "leave it
 * alone". Serialising `undefined` away preserves that distinction; `null`
 * survives on purpose.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Merge a caller-supplied `custom.cf_...` map into a request body.
 *
 * Close sets custom fields as TOP-LEVEL keys named `custom.<FIELD_ID>` — not as
 * a nested `custom` object. Its own create-a-lead page is explicit that the
 * nested `custom` dict and the `custom.FIELD_NAME` (by-name) form are both
 * deprecated and slated for removal, so this app accepts a flat map keyed by
 * field id and flattens it onto the body. Keys are passed through verbatim: a
 * caller may supply either `cf_abc` or `custom.cf_abc`, and both land as
 * `custom.cf_abc`.
 */
export function withCustomFields(
  body: Record<string, unknown>,
  custom?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!custom) return body;
  const out = { ...body };
  for (const [k, v] of Object.entries(custom)) {
    out[k.startsWith("custom.") ? k : `custom.${k}`] = v;
  }
  return out;
}

/** The `Param` every action that writes custom-field values reuses. */
export const CUSTOM_FIELDS_PARAM = {
  key: "customFields",
  label: "Custom fields",
  type: "json" as const,
  hint:
    'JSON object keyed by custom field id, e.g. `{"cf_abc123": "Segway"}`. Discover the ids with ' +
    "the List Custom Fields action. Sent as top-level `custom.<id>` keys, which is the only " +
    "non-deprecated form.",
};

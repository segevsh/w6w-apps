import type { HookContext } from "@w6w/types";

/**
 * Copper Developer API v1.
 *
 * ## The base URL, and the rename behind it
 *
 * Copper was founded as **ProsperWorks** and rebranded to **Copper**. The path
 * segment `developer_api` is a fossil of that era and is still load-bearing —
 * it is part of the URL, not a version marker. Copper's own getting-started
 * page states the base as `https://api.copper.com/developer_api/` and notes the
 * host moved off the prosperworks domain in early 2022; every endpoint page in
 * the docs prints the fully qualified form, e.g.
 * `POST https://api.copper.com/developer_api/v1/people/search`.
 *
 * Only `api.copper.com` is on this app's egress allowlist. The legacy
 * prosperworks host is neither called nor allowlisted. (Verified 2026-08-03
 * against <https://developer.copper.com/>.)
 *
 * ## Listing is a POST, not a GET — the single easiest thing to get wrong
 *
 * Copper has no `GET /people`. Every collection is read through a **`/search`
 * sub-resource that takes a POST with a JSON body**:
 *
 *     POST /people/search        POST /companies/search
 *     POST /opportunities/search POST /leads/search
 *     POST /tasks/search         POST /activities/search
 *     POST /users/search
 *
 * Filters, sorting and pagination all live in that body — there are no query
 * strings on these calls. `GET /{resource}/{id}` (fetch one) does exist, as do a
 * handful of genuinely GET-shaped metadata collections (`/pipelines`,
 * `/pipeline_stages`, `/activity_types`, `/custom_field_definitions`), which is
 * exactly why the distinction is easy to blur. `search()` below is the one place
 * the POST-with-body shape is expressed.
 *
 * ## Pagination lives in the body too
 *
 * `page_number` (1-based, default 1) and `page_size` (default 20, max 200) are
 * body fields. Copper documents a hard ceiling of 100,000 records reachable by
 * paging any one search, and recommends narrowing the filter rather than paging
 * past it. It also recommends always sorting, so results stay stable across
 * pages.
 *
 * ## Totals arrive on a header, not in the body
 *
 * A `/search` response body is a **bare JSON array** — there is no envelope. The
 * count comes back as the `X-PW-TOTAL` response header, which Copper documents
 * as "an upper bound of the total number of records returned in the search
 * query". `search()` folds the two together into `{ records, total }` so a
 * workflow can page without a second round trip, and `total` is `undefined`
 * rather than `0` when the header is absent — an unknown total and an empty
 * result are different facts.
 */
export const API_URL = "https://api.copper.com/developer_api/v1";

/** Copper's documented default page size. */
export const DEFAULT_PAGE_SIZE = 20;

/** Copper's documented maximum page size. */
export const MAX_PAGE_SIZE = 200;

/** Shared paging/sorting inputs; every `/search` action accepts these. */
export interface SearchInput {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

/** What `search()` hands back: the bare array plus the header-borne total. */
export interface SearchResult<T = unknown> {
  records: T[];
  /** From `X-PW-TOTAL`. Undefined when the header was absent or unparseable. */
  total?: number;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an
 * `X-PW-AccessToken` or `X-PW-UserEmail` header. Copper's authentication is a
 * *set* of three headers, and all three are stamped by the auth `sign` hook —
 * the only code the runtime hands the raw credential. An action that set them
 * itself would leak the credential into the network-capable worker and fail the
 * pack auditor.
 */
export class CopperClient {
  constructor(private ctx: HookContext) {}

  async raw(path: string, options: RequestOptions = {}): Promise<Response> {
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
      // Copper requires `Content-Type: application/json` on every call it
      // documents; it is set here for the ones that actually carry a body, and
      // `sign` does not need to add it because a bodyless GET has nothing to
      // type.
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
        `Copper ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    return res;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.raw(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * `POST /{resource}/search` — the only way Copper lists anything.
   *
   * Returns the bare array under `records` and the `X-PW-TOTAL` header under
   * `total`, because Copper splits the two across body and header.
   */
  async search<T = unknown>(path: string, body: Record<string, unknown>): Promise<SearchResult<T>> {
    const res = await this.raw(path, { method: "POST", body });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : [];
    return {
      records: Array.isArray(parsed) ? parsed as T[] : [],
      total: parseTotal(res.headers.get("x-pw-total")),
    };
  }
}

/**
 * `X-PW-TOTAL` as a number, or `undefined`.
 *
 * Deliberately not defaulted to 0: "Copper did not tell us how many there are"
 * and "there are none" are different answers, and collapsing them would make a
 * paging loop stop early.
 */
export function parseTotal(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Drop keys whose value is `undefined`.
 *
 * This matters on Copper's PUTs specifically: "Updates are only applied to
 * fields explicitly specified in the request body... To remove the value from a
 * field, the request body must specify the target field value as 'null'." So an
 * explicit `null` is a meaningful instruction to clear a field while `undefined`
 * means "leave it alone". Serialising `undefined` away preserves that
 * distinction; `null` survives on purpose.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Build the paging/sorting half of a `/search` body from the shared params.
 *
 * Copper's own advice is repeated here by construction: "It is highly
 * recommended that you sort the results you get back from a /search endpoint",
 * because an unsorted page 2 may overlap page 1.
 */
export function searchBody(
  input: SearchInput,
  filters: Record<string, unknown> = {},
): Record<string, unknown> {
  return compact({
    ...filters,
    page_number: input.pageNumber,
    page_size: input.pageSize,
    sort_by: input.sortBy,
    sort_direction: input.sortDirection,
  }) as Record<string, unknown>;
}

/**
 * The `Param[]` fragment every `/search` action reuses, so paging looks
 * identical everywhere.
 */
export const SEARCH_PARAMS = [
  {
    key: "pageNumber",
    label: "Page number",
    type: "number" as const,
    hint: "1-based page to request (`page_number`). Copper defaults to 1.",
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number" as const,
    hint:
      `Records per page (\`page_size\`). Copper defaults to ${DEFAULT_PAGE_SIZE} and caps it at ` +
      `${MAX_PAGE_SIZE}. A single search can page through at most 100,000 records however it is ` +
      `sized — narrow the filter rather than paging past that.`,
    validation: { min: 1, max: MAX_PAGE_SIZE, integer: true },
  },
  {
    key: "sortBy",
    label: "Sort by",
    type: "string" as const,
    hint:
      "Field to sort on (`sort_by`). Copper recommends always sorting, so pages stay consistent " +
      "between requests; `date_modified` is the usual choice for incremental syncs.",
  },
  {
    key: "sortDirection",
    label: "Sort direction",
    type: "select" as const,
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
    hint: "`sort_direction`. Copper defaults to `asc`.",
  },
];

/** The `output` fragment every `/search` action reuses. */
export const SEARCH_OUTPUT = [
  { key: "records", type: "array" as const, label: "Matching records" },
  {
    key: "total",
    type: "number" as const,
    label: "Upper-bound total (X-PW-TOTAL header)",
  },
];

/**
 * The `Param` every action that writes custom-field values reuses.
 *
 * Copper models custom fields as an ARRAY of `{custom_field_definition_id,
 * value}` pairs — not as a map and not as top-level dotted keys. Discover the
 * ids with the List Custom Field Definitions action.
 */
export const CUSTOM_FIELDS_PARAM = {
  key: "customFields",
  label: "Custom fields",
  type: "json" as const,
  hint:
    'JSON array of `{"custom_field_definition_id": 100764, "value": "..."}` objects. Discover the ' +
    "ids with the List Custom Field Definitions action. `value` is a number, string, option id or " +
    "Unix timestamp depending on the definition's `data_type`.",
};

/**
 * The entity types Copper's Related Items API accepts in a path segment.
 *
 * Verbatim from the Related Items overview, which enumerates the permitted
 * relationships: "Leads: Tasks / People: Companies (limit 1), Opportunities,
 * Tasks, Projects / Companies: Opportunities, People, Tasks, Projects /
 * Opportunities: Companies, People, Tasks, Projects / Projects: Companies,
 * People, Opportunities, Tasks / Tasks: Companies, People, Opportunities,
 * Leads, Projects (limit 1 total)".
 */
export const RELATED_ENTITIES = [
  "leads",
  "people",
  "companies",
  "opportunities",
  "projects",
  "tasks",
] as const;

/**
 * The parent types an Activity or Task may hang off.
 *
 * Verbatim from the Activities search footnote: `parent` is
 * `{"id": parent_id, "type": parent_type}` where "parent_type" can be "lead",
 * "person", "company", "opportunity", "project", "task".
 */
export const PARENT_TYPES = [
  "lead",
  "person",
  "company",
  "opportunity",
  "project",
  "task",
] as const;

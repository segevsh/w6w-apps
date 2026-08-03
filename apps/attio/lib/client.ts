import type { HookContext } from "@w6w/types";

/**
 * Attio REST API v2.
 *
 * ## Everything here was transcribed from the vendor's OpenAPI documents
 *
 * Attio publishes a real, fetchable OpenAPI 3.1 specification. The docs site is
 * a Mintlify SPA, so the spec URL is not linked from the chrome — it is named on
 * one page, `/rest-api/endpoint-reference/openapi`, which says: "Attio exposes a
 * public OpenAPI specification for the Attio REST API. The specification is
 * available [here](https://api.attio.com/openapi/api)."
 *
 * Three documents exist, all served as `application/json` (fetched 2026-08-03):
 *
 *   - `https://api.attio.com/openapi/api`              — 770,609 B, "Attio API" 2.0.0
 *   - `https://api.attio.com/openapi/standard-objects` — 1,008,270 B, "Attio Standard Objects" 2.0.0
 *   - `https://api.attio.com/openapi/webhooks`         — 79,231 B, "Attio Webhook Events"
 *
 * Every path, parameter name, body shape and error code in this app came out of
 * the first two, not out of prose and not out of memory.
 *
 * ## The base URL
 *
 * Both REST documents declare exactly one server:
 * `{"url": "https://api.attio.com", "description": "Production"}`. Every path is
 * prefixed `/v2`, hence `API_URL` below. `api.attio.com` is the only host the
 * actions call and the only host on the app's egress allowlist.
 *
 * Two neighbours are deliberately NOT allowlisted, because nothing here calls
 * them: `app.attio.com` (the OAuth `authorize` / `token` / `introspect`
 * endpoints — see `auth/api-key.ts` for why OAuth is not shipped) and
 * `docs.attio.com` (a Mintlify docs site, for humans). The status host is
 * widened for one unsigned health hook only; see `health/service.ts`.
 *
 * ## Standard objects and custom objects share ONE endpoint shape
 *
 * This is worth stating because the docs' navigation implies otherwise: there is
 * a "Companies" section, a "People" section, a "Deals" section, each with its
 * own create/update/upsert/list pages. They are not separate endpoints. The
 * `standard-objects` document contains only these paths:
 *
 *     /v2/objects/companies/records            /v2/objects/people/records
 *     /v2/objects/companies/records/query      /v2/objects/people/records/query
 *     /v2/objects/companies/records/{record_id}   … and the same five for
 *                                                    deals, users, workspaces
 *
 * — i.e. `/v2/objects/{object}/records` from the main document with `{object}`
 * bound to a literal slug. The standard-objects document is a *typed overlay*:
 * it names each standard object's system attributes (`domains`, `name`,
 * `email_addresses`, `stage`, `value`, …) in the request schema so the reference
 * page can show them. It introduces no route the generic path does not have.
 *
 * So this app ships **object-parameterised** record actions rather than five
 * near-identical copies. One Create Record works on `people`, on `companies`,
 * and on a custom object a workspace invented this morning — which is the whole
 * point of Attio's data model, and would be thrown away by hard-coding slugs.
 *
 * ## Two response envelopes, and neither is the array
 *
 * Every successful response is `{"data": …}`. `data` is an object for a single
 * resource and an array for a collection. Cursor-paginated endpoints add a
 * sibling: `{"data": [...], "pagination": {"next_cursor": "…"}}`.
 *
 * ## Pagination is limit/offset almost everywhere, and the defaults differ wildly
 *
 * The Pagination guide describes two schemes and says which endpoints use which.
 * Every endpoint this app calls uses **limit/offset**; the cursor scheme appears
 * only on `/v2/meetings` and `/v2/emails`, which this app does not ship.
 *
 * The defaults are NOT uniform, and they are documented per endpoint in the
 * spec. Transcribed verbatim, because guessing "probably 100" would silently
 * truncate a note listing at 10:
 *
 *   | Endpoint                              | Default limit | Max     |
 *   | ------------------------------------- | ------------- | ------- |
 *   | `POST /objects/{object}/records/query`| 500           | —       |
 *   | `POST /lists/{list}/entries/query`    | 500           | —       |
 *   | `GET  /tasks`                         | 500           | —       |
 *   | `GET  /notes`                         | **10**        | **50**  |
 *   | `GET  …/{record_id}/entries`          | 100           | 1000    |
 *   | `POST /objects/records/search`        | 25            | **25**  |
 *
 * The two query endpoints take `limit`/`offset` **in the JSON body**; the rest
 * take them on the query string. That split is the reason `PAGE_PARAMS` and
 * `pageBody()` / `pageQuery()` are separate exports rather than one helper.
 *
 * ## Rate limits: 100 rps read, 25 rps write, and no headroom header
 *
 * From the Rate limiting guide: "Our rate limit across the whole API is **100
 * requests per second** for read requests, **25 requests per second** for write
 * requests." Exceeding it returns `429` with a `Retry-After` header whose value
 * is a **date**, not a number of seconds ("Retry-After: Tue, 23 May 2023
 * 14:42:01 GMT"). `List records` and `List entries` are additionally metered by
 * a complexity score over a sliding 10-second window.
 *
 * Nothing reports remaining allowance. See `health/quota.ts` — that absence is
 * verified three ways and is why the quota check is declared `unavailable`
 * rather than faked.
 */
export const API_URL = "https://api.attio.com/v2";

/** `POST …/records/query` and `POST …/entries/query`: documented default limit. */
export const QUERY_DEFAULT_LIMIT = 500;

/** `POST /objects/records/search`: documented default AND maximum. */
export const SEARCH_MAX_LIMIT = 25;

/** `GET /notes`: documented default and maximum. Unusually small — see above. */
export const NOTES_DEFAULT_LIMIT = 10;
export const NOTES_MAX_LIMIT = 50;

/** `GET …/{record_id}/entries`: documented default and maximum. */
export const RECORD_ENTRIES_DEFAULT_LIMIT = 100;
export const RECORD_ENTRIES_MAX_LIMIT = 1000;

/** What `list()` hands back: the envelope flattened into a stable shape. */
export interface AttioList<T = unknown> {
  records: T[];
  /** Present only on the cursor-paginated endpoints. Carried through untouched. */
  pagination?: Record<string, unknown>;
}

/** Query params shared by every limit/offset endpoint. */
export interface PageInput {
  limit?: number;
  offset?: number;
}

/** Map page inputs onto the documented names, for a query-string endpoint. */
export function pageQuery(input: PageInput): Record<string, number | undefined> {
  return { limit: input.limit, offset: input.offset };
}

/** Map page inputs onto the documented names, for a JSON-body endpoint. */
export function pageBody(input: PageInput): Record<string, number | undefined> {
  return { limit: input.limit, offset: input.offset };
}

/**
 * Build the `Param[]` fragment for a paginated endpoint.
 *
 * Takes the endpoint's own default and maximum rather than assuming one, because
 * on this API they genuinely differ per endpoint (see the table above) and a
 * hint that says "defaults to 500" on `GET /notes` would be a lie that costs
 * someone 490 missing notes.
 */
export function pageParams(opts: { defaultLimit?: number; maxLimit?: number } = {}) {
  const { defaultLimit, maxLimit } = opts;
  const limitHint = [
    "Maximum results to return.",
    defaultLimit !== undefined ? `Attio defaults to ${defaultLimit}.` : undefined,
    maxLimit !== undefined ? `The documented maximum is ${maxLimit}.` : undefined,
  ].filter(Boolean).join(" ");

  return [
    {
      key: "limit",
      label: "Limit",
      type: "number" as const,
      hint: limitHint,
      validation: { min: 1, integer: true, ...(maxLimit !== undefined ? { max: maxLimit } : {}) },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number" as const,
      advanced: true,
      hint:
        "Results to skip. Defaults to 0. Page by adding the previous `limit` to it; when a page " +
        "comes back shorter than `limit`, you have reached the end.",
      validation: { min: 0, integer: true },
    },
  ];
}

/** The `output` fragment every collection action reuses. */
export const PAGE_OUTPUT = [
  { key: "records", type: "array" as const, label: "Results (the response `data` array)" },
];

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
 * itself would both leak credential material into the network-capable worker and
 * fail the pack auditor.
 */
export class AttioClient {
  constructor(private ctx: HookContext) {}

  async raw(path: string, options: RequestOptions = {}): Promise<Response> {
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
    return res;
  }

  /** A request whose parsed JSON body you want in full, envelope and all. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.raw(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A request unwrapped out of the `{ "data": … }` envelope.
   *
   * `DELETE` is the one caller that legitimately gets nothing useful: the spec
   * gives every delete a `200` whose schema is `{"type": "object",
   * "properties": {}}` — an empty object, not a `204`. `undefined` comes back
   * for that, which is accurate.
   */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data?: T }>(path, options);
    return body?.data as T;
  }

  /** A collection request, unwrapped into `{ records, pagination? }`. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<AttioList<T>> {
    const body = await this.request<Record<string, unknown>>(path, options);
    return unwrapList<T>(body);
  }
}

/**
 * Flatten `{ data: [...], pagination? }` into `{ records, pagination? }`.
 *
 * Exported so `tests/lib/client.test.ts` can pin it against the shapes the spec
 * actually publishes, including the awkward one: a handful of endpoints return
 * `data` as a single OBJECT rather than an array (there is no such collection in
 * this app today, but a future one would silently yield `records: []` if this
 * did not say what it does). An object `data` is wrapped in a one-element array
 * rather than dropped, and a missing `data` yields an empty list, never a throw.
 */
export function unwrapList<T = unknown>(body: unknown): AttioList<T> {
  if (!body || typeof body !== "object") return { records: [] };
  const record = body as Record<string, unknown>;
  const pagination = record.pagination && typeof record.pagination === "object"
    ? record.pagination as Record<string, unknown>
    : undefined;

  const data = record.data;
  if (Array.isArray(data)) return { records: data as T[], ...(pagination ? { pagination } : {}) };
  if (data && typeof data === "object") {
    return { records: [data as T], ...(pagination ? { pagination } : {}) };
  }
  return { records: [], ...(pagination ? { pagination } : {}) };
}

/**
 * Attio's error body, identical on every documented failure.
 *
 * Both OpenAPI documents declare the same four-field object on every non-2xx
 * response, and the live server matches it exactly. Observed on the wire,
 * 2026-08-03:
 *
 *     $ curl https://api.attio.com/v2/objects
 *     HTTP/2 401
 *     {"status_code":401,"type":"auth_error","code":"unauthorized",
 *      "message":"The Authorization header was not provided. …"}
 *
 * `type` is one of `invalid_request_error` (150 occurrences in the spec),
 * `auth_error` (4) or `rate_limit_error` (documented in the rate-limiting guide,
 * absent from the spec). `code` is the useful half, and the full enumerated set
 * across both documents is:
 *
 *     not_found (89) · merge_in_progress (22) · value_not_found (19) ·
 *     validation_type (15) · slug_conflict (8) · filter_error (7) ·
 *     missing_value (7) · billing_error (3) · quota_exceeded (2) ·
 *     immutable_value (2) · system_edit_unauthorized · self_merge ·
 *     unauthorized · multiple_match_results
 *
 * Three of those are worth recognising by name, because the fix is not obvious
 * from the sentence alone, and `explainCode()` below appends a clause for each:
 *
 *   - `multiple_match_results` — Upsert Entry found more than one entry with the
 *     same parent record, so it refuses to guess which to update.
 *   - `merge_in_progress` — a `404` that is not "gone", it is "not yet"; a large
 *     merge is still being applied and the record becomes readable shortly.
 *   - `quota_exceeded` / `billing_error` — a **plan** limit, not a rate limit.
 *     Retrying will not help; upgrading will.
 */
export interface AttioError {
  status_code?: number;
  type?: string;
  code?: string;
  message?: string;
}

/** Extra sentence for the error codes whose remedy is not in the vendor's message. */
export function explainCode(code: string | undefined): string {
  switch (code) {
    case "multiple_match_results":
      return " (more than one record/entry matched — narrow the matching attribute so it is unique)";
    case "merge_in_progress":
      return " (this record is mid-merge, not missing — it becomes readable once the merge finishes)";
    case "quota_exceeded":
    case "billing_error":
      return " (this is an Attio PLAN limit, not a rate limit — retrying will not clear it)";
    case "slug_conflict":
      return " (a slug must be unique on its object/list — pick another)";
    case "immutable_value":
    case "system_edit_unauthorized":
      return " (this is a system-managed value and cannot be written through the API)";
    default:
      return "";
  }
}

/**
 * Turn a failed response into a message worth reading.
 *
 * The message is built from the RESPONSE only; the request's headers are never
 * in scope here, so nothing in this function can echo a credential.
 */
async function errorMessage(res: Response, method: string, path: string): Promise<string> {
  let detail = "";
  try {
    detail = await res.text();
  } catch {
    // Body already consumed or unreadable — the status still tells the story.
  }
  let parsed: AttioError | undefined;
  try {
    parsed = JSON.parse(detail) as AttioError;
  } catch {
    // Non-JSON body (a Cloudflare error page, say); fall through to raw text.
  }

  const label = parsed?.code ? `${parsed.type ?? "error"}/${parsed.code}` : parsed?.type;
  const tail = parsed?.message ?? detail;
  return `Attio ${res.status} ${res.statusText || ""}`.trimEnd() +
    ` for ${method} ${path}${label ? ` [${label}]` : ""}${tail ? `: ${tail}` : ""}` +
    explainCode(parsed?.code);
}

/**
 * Drop keys whose value is `undefined`, so an untouched optional param does not
 * serialise as an explicit `null`.
 *
 * The distinction matters on this API: `deadline_at` on a task is typed
 * `["string", "null"]`, and an explicit `null` **clears the deadline** while
 * omission leaves it alone. `undefined` means "leave it alone" and is stripped;
 * an explicit `null` from a workflow author survives, because that is a
 * deliberate instruction.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** Build a `select` param's options from a readonly string tuple. */
export function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

/**
 * The `object` param every record action reuses.
 *
 * Deliberately a free-text string and not a `select` of the five standard
 * slugs. Attio workspaces define their own objects, and the whole value of the
 * generic `/v2/objects/{object}/records` route is that a custom object works
 * exactly like `people` does. A fixed option list would quietly amputate that.
 */
export const OBJECT_PARAM = {
  key: "object",
  label: "Object",
  type: "string" as const,
  required: true,
  placeholder: "people",
  hint:
    "The object's `api_slug` or UUID. Standard slugs are `people`, `companies`, `deals`, `users` " +
    "and `workspaces`; custom objects use whatever slug the workspace gave them. List them with " +
    "the List Objects action. Slugs of system objects are stable across workspaces and over time; " +
    "custom slugs are mutable, so use the UUID if an integration must survive a rename.",
};

/** The `list` param every list-entry action reuses. */
export const LIST_PARAM = {
  key: "list",
  label: "List",
  type: "string" as const,
  required: true,
  placeholder: "sales",
  hint: "The list's `api_slug` or UUID. Find both with the List Lists action.",
};

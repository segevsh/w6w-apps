import type { HookContext } from "@w6w/types";

/**
 * Follow Up Boss API v1.
 *
 * ## The base URL, and the documentation host that is NOT it
 *
 * The API lives at `https://api.followupboss.com/v1`. That string is the single
 * `servers[0].url` entry in every one of the machine-readable OpenAPI documents
 * Follow Up Boss embeds in its reference pages (verified 2026-08-03 across
 * `/me`, `/identity`, `/people`, `/stages`, `/pipelines`, `/deals`,
 * `/rateLimit/limits` and others). The Getting Started page states "HTTPS is
 * required for security, HTTP will not work" and that `v1` is "currently the
 * only version".
 *
 * Worth recording because it trips people up: **`https://api.followupboss.com/`
 * is also where the documentation used to live**, and the old
 * `https://api.followupboss.com/api-documentation/` URL — still the link printed
 * in a lot of third-party integration directories — now answers
 * `301 Moved Permanently` to `https://docs.followupboss.com/` (verified on the
 * wire, 2026-08-03). Docs and API share a hostname's history but not its
 * present: only `api.followupboss.com` is called, and only it is allowlisted.
 * `docs.followupboss.com` is a reference for humans and is deliberately NOT on
 * the egress allowlist.
 *
 * ## Every collection is a plain `GET` with query-string filters
 *
 * Unlike Copper (POST `/search` sub-resources) or Close (a separate Advanced
 * Filtering endpoint), Follow Up Boss keeps it boring: `GET /people?email=...`,
 * `GET /tasks?due=overdue`, `GET /deals?pipelineId=3`. The Searching page says
 * it in one line — "you can filter results by specifying search conditions as
 * query parameters in the URL" — and multiple criteria "will be combined using
 * AND logic". There is no body-based query language to learn.
 *
 * ## Pagination: `limit` / `offset`, but `next` is the one to use
 *
 * From the Pagination page, verbatim: the default `limit` is **10**, the default
 * `offset` is **0**, and "The maximum value for the limit parameter is `100`".
 *
 * Two things about it are unusual enough to be worth stating loudly:
 *
 *  1. **Results come back in DESCENDING id order by default.** "Resources are
 *     returned in reverse order by `id` by default, meaning the API returns the
 *     last 10 resources in a collection." Newest-first is the default, not
 *     oldest-first, so `GET /people?limit=5` is "the 5 most recent people".
 *  2. **`offset` is not always allowed.** "If you are going deep into result
 *     sets with high offset values, and keyset pagination is possible, the API
 *     enforces the use of the `next` parameter for pagination instead of
 *     `offset`." So a deep offset walk does not merely get slow — it gets
 *     rejected. `next` (an opaque keyset cursor from `_metadata.next`) is what
 *     the docs call "**highly** encouraged" and what every list action here
 *     exposes alongside `offset`.
 *
 * ## The response envelope names its own array, and the name is not the path
 *
 * Every list response is `{ "_metadata": {...}, "<collection>": [...] }`. The
 * array key is NOT derivable from the URL path, which is the trap:
 *
 *     GET /customFields  ->  { "_metadata": { "collection": "customfields" },
 *                              "customfields": [ ... ] }     <- lower-cased
 *     GET /smartLists    ->  { "_metadata": { "collection": "smartlists" },
 *                              "smartlists":  [ ... ] }      <- lower-cased
 *     GET /people        ->  { "_metadata": { "collection": "people" },
 *                              "people":      [ ... ] }
 *
 * Hard-coding `body[camelCasePathSegment]` therefore silently yields `undefined`
 * on exactly the two metadata endpoints an integration reaches for first.
 * `list()` below reads `_metadata.collection` to find the key, and falls back to
 * "the only array-valued property that is not `_metadata`" when the metadata is
 * missing or names a key that is not present. Both arms are pinned by
 * `tests/lib/client.test.ts`.
 */
export const API_URL = "https://api.followupboss.com/v1";

/** The documented default page size. */
export const DEFAULT_LIMIT = 10;

/** The documented maximum page size. */
export const MAX_LIMIT = 100;

/**
 * The `_metadata` block on every list response, verbatim from the Pagination
 * page's example.
 *
 * `next` is an opaque keyset cursor (base64 in practice — `eyJzaW5jZUlkIjoxMDV9`
 * decodes to `{"sinceId":105}` — but it is not documented as such and must be
 * round-tripped untouched, never parsed or synthesised).
 */
export interface FubMetadata {
  collection?: string;
  offset?: number;
  limit?: number;
  total?: number;
  next?: string | null;
  nextLink?: string | null;
  [key: string]: unknown;
}

/** What `list()` hands back: the envelope flattened into a stable shape. */
export interface FubList<T = unknown> {
  records: T[];
  metadata: FubMetadata;
}

/** Query params shared by every paginated list endpoint. */
export interface PageInput {
  limit?: number;
  offset?: number;
  next?: string;
}

/** Map the shared page inputs onto the documented query names. */
export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return { limit: input.limit, offset: input.offset, next: input.next };
}

/**
 * The `Param[]` fragment every paginated list action reuses, so paging looks
 * identical everywhere.
 *
 * The `next`-over-`offset` advice is Follow Up Boss's own and is repeated at the
 * form rather than buried in a doc, because the failure it prevents (a deep
 * offset walk being refused outright) shows up only once a collection is large
 * — i.e. in production, on the biggest customer.
 */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint:
      `Records per page. Follow Up Boss defaults to ${DEFAULT_LIMIT} and caps it at ${MAX_LIMIT}.`,
    validation: { min: 1, max: MAX_LIMIT, integer: true },
  },
  {
    key: "next",
    label: "Next cursor",
    type: "string" as const,
    hint:
      "Keyset cursor from the previous page's `metadata.next`. This is the **recommended** way to " +
      "page: past a high offset the API stops accepting `offset` and requires `next` instead. " +
      "Pass the value through untouched — it is opaque.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number" as const,
    advanced: true,
    hint:
      "Records to skip. Simple but shallow — prefer the Next cursor, which the API enforces once " +
      "offsets get large. Note results are newest-first (descending id) by default, so offset 0 " +
      "is the most recent record, not the oldest.",
    validation: { min: 0, integer: true },
  },
];

/** The `output` fragment every list action reuses. */
export const PAGE_OUTPUT = [
  { key: "records", type: "array" as const, label: "Matching records" },
  { key: "metadata", type: "object" as const, label: "Envelope `_metadata` (total, next, …)" },
];

/**
 * The `Param` every action that reads People reuses.
 *
 * Follow Up Boss does not return every field by default and says so: "not all
 * available fields are included in the response by default. Use the `fields`
 * argument to request exactly the fields you need." It also warns against
 * shipping `allFields` — "as this may return very large responses it is
 * recommended to update this to specify exactly the fields you need for your
 * production deployments".
 */
export const FIELDS_PARAM = {
  key: "fields",
  label: "Fields",
  type: "string" as const,
  hint: "Comma-separated list of fields to return (e.g. `id,name,emails,stage`). Special values: " +
    "`allCustom` for every custom field, `allFields` for everything. `allFields` is fine while " +
    "exploring, but Follow Up Boss recommends naming the fields you actually need in production " +
    "— responses get very large. Include `relationships` here instead of calling " +
    "`/peopleRelationships` separately.",
};

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an `Authorization`,
 * `X-System` or `X-System-Key` header. The runtime routes every request through
 * the auth `sign` hook, which is the only code handed the raw credential. An
 * action that set any of those itself would both leak credential material into
 * the network-capable worker and fail the pack auditor.
 */
export class FubClient {
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
      // "We also recommend including a header indicating the content type of the
      // request body: `Content-Type: application/json`" — set only on the calls
      // that actually carry one, since a bodyless GET has nothing to type.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) throw new Error(await errorMessage(res, options.method ?? "GET", url.pathname));
    return res;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.raw(path, options);
    // `POST /events` documents a 204 with no body as a real, non-error outcome:
    // "this indicates that the lead flow associated with this source has been
    // archived and ignored". Returning undefined rather than throwing keeps that
    // distinguishable from a transport failure.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A paginated `GET`, unwrapped into `{ records, metadata }`.
   *
   * See the module comment: the array's key comes from `_metadata.collection`,
   * not from the request path, because the two disagree for `/customFields` and
   * `/smartLists`.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<FubList<T>> {
    const body = await this.request<Record<string, unknown>>(path, options);
    return unwrapList<T>(body);
  }
}

/**
 * Flatten `{ _metadata, <collection>: [...] }` into `{ records, metadata }`.
 *
 * Exported so `tests/lib/client.test.ts` can pin both the metadata-driven arm
 * and the fallback against the shapes the docs actually publish.
 */
export function unwrapList<T = unknown>(body: unknown): FubList<T> {
  if (!body || typeof body !== "object") return { records: [], metadata: {} };
  const record = body as Record<string, unknown>;
  const metadata = (record._metadata ?? {}) as FubMetadata;

  const named = typeof metadata.collection === "string" ? record[metadata.collection] : undefined;
  if (Array.isArray(named)) return { records: named as T[], metadata };

  // Fallback: the only array-valued property that is not `_metadata`. Used when
  // the envelope omits `_metadata`, or names a collection whose key is absent.
  for (const [key, value] of Object.entries(record)) {
    if (key === "_metadata") continue;
    if (Array.isArray(value)) return { records: value as T[], metadata };
  }
  return { records: [], metadata };
}

/**
 * Turn a failed response into a message worth reading.
 *
 * Follow Up Boss documents its error body as "valid JSON, with an
 * `errorMessage` key which explains why the request could not be processed", and
 * the live 401 confirms the shape exactly:
 *
 *     {"errorMessage":"Authentication is required. Use Basic HTTP Authentication
 *      with API Key as username and blank password, ..."}
 *
 * (Observed on the wire against `GET https://api.followupboss.com/v1/identity`,
 * 2026-08-03.) A few endpoints instead return `{"error": "..."}` — the
 * `/rateLimit/*` pair documents `{"error": "Only registered systems can use this
 * endpoint."}` — so both keys are read.
 *
 * The raw body is appended only when neither key was found, so a normal API
 * error produces a short sentence rather than a wall of JSON. Nothing here can
 * echo a credential: the message is built from the RESPONSE, and the request's
 * headers are never in scope.
 */
async function errorMessage(res: Response, method: string, path: string): Promise<string> {
  let detail = "";
  try {
    detail = await res.text();
  } catch {
    // Body already consumed or unreadable — the status still tells the story.
  }
  let explained: string | undefined;
  try {
    const parsed = JSON.parse(detail) as { errorMessage?: string; error?: string };
    explained = parsed.errorMessage ?? parsed.error;
  } catch {
    // Non-JSON body (a CDN error page, say); fall through to the raw text.
  }
  const tail = explained ?? detail;
  return `Follow Up Boss ${res.status} ${res.statusText} for ${method} ${path}${
    tail ? `: ${tail}` : ""
  }`;
}

/**
 * Drop keys whose value is `undefined`, so an untouched optional param does not
 * serialise as an explicit `null`.
 *
 * The distinction is load-bearing on this API's PUTs. `PUT /people/:id`
 * overwrites the collection-valued fields it receives — "the `phones` argument
 * will overwrite all existing phone numbers", and "when using the tags property,
 * all existing tags for a person will be overwritten" — so sending
 * `{"tags": null}` because the user left the field blank would *destroy* data.
 * `undefined` means "leave it alone" and is stripped; an explicit `null` from a
 * workflow author survives, because that is a deliberate instruction.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Merge a `customFields` JSON object into a request body.
 *
 * Follow Up Boss models custom fields as **top-level keys prefixed `custom`** —
 * not as a nested map and not as an array of id/value pairs. The customFields
 * endpoint spells out the contract: "`name`: The name of this custom field in
 * API responses. This is also name you should use if you wish to update a custom
 * field on a person or send in a custom field with a new lead", with the worked
 * example "to send a value for a field named 'Close Price', use the field name
 * `customClosePrice`".
 *
 * So the correct body is `{"firstName": "Mary", "customClosePrice": 425000}` —
 * flat. Keys are merged in as given rather than prefixed here, because the
 * prefixed `name` is what the List Custom Fields action returns and inventing a
 * second naming convention would guarantee they drift apart.
 */
export function withCustomFields<T extends Record<string, unknown>>(
  body: T,
  customFields: unknown,
): Record<string, unknown> {
  const base = compact(body) as Record<string, unknown>;
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) return base;
  return { ...base, ...(customFields as Record<string, unknown>) };
}

/**
 * The `Param` every action that writes custom-field values reuses.
 */
export const CUSTOM_FIELDS_PARAM = {
  key: "customFields",
  label: "Custom fields",
  type: "json" as const,
  advanced: true,
  hint: 'JSON object of custom field names to values, e.g. `{"customClosePrice": 425000, ' +
    '"customBirthday": "1990-02-16"}`. Use the **name** (not the label) reported by the List ' +
    "Custom Fields action — Follow Up Boss prefixes it with `custom`. These merge into the " +
    "request body as top-level keys, which is how the API models them.",
};

/**
 * Contact-method sub-params, shared by Create Person and Update Person.
 *
 * The API takes `emails` / `phones` as arrays of `{value, type}` objects, per
 * the `POST /people` schema: "A list of email addresses associated with the
 * person. (Specify type and value, isPrimary is not expected. The first email in
 * the list will be the primary.)" The ordering rule is repeated in each hint
 * because it is invisible in the payload and impossible to guess.
 */
export const EMAILS_PARAM = {
  key: "emails",
  label: "Email addresses",
  type: "json" as const,
  hint:
    'JSON array of `{"value": "a@example.com", "type": "home"}` objects. Do not send `isPrimary` ' +
    "— the **first entry in the list becomes the primary** address.",
};

export const PHONES_PARAM = {
  key: "phones",
  label: "Phone numbers",
  type: "json" as const,
  hint: 'JSON array of `{"value": "555-555-5555", "type": "mobile"}` objects. Do not send ' +
    "`isPrimary` — the **first entry becomes the primary** number.",
};

export const ADDRESSES_PARAM = {
  key: "addresses",
  label: "Addresses",
  type: "json" as const,
  advanced: true,
  hint: 'JSON array of address objects, e.g. `{"street": "123 Main St", "city": "Austin", ' +
    '"state": "TX", "code": "78701", "type": "home"}`. These are where the person can be ' +
    "reached — not the address of a property they are interested in (that belongs on an event).",
};

/**
 * The task types the API accepts, verbatim from the `POST /tasks` enum.
 *
 * Note the GET and POST documentation disagree by one entry: the `GET /tasks`
 * `type` filter lists `Follow Up, Call, Email, Text, Appointment, Showing,
 * Closing, Open House, Thank You` while the `POST`/`PUT` request schema
 * enumerates the same nine in a different order. The set is identical; only the
 * ordering differs, so one list is used for both.
 */
export const TASK_TYPES = [
  "Follow Up",
  "Call",
  "Text",
  "Email",
  "Appointment",
  "Showing",
  "Closing",
  "Open House",
  "Thank You",
] as const;

/**
 * The event types the API accepts.
 *
 * These fourteen are verbatim from the `POST /events` `type` description, and
 * they are cross-checked against the `GET /events` `type` filter, which
 * enumerates **exactly the same fourteen in the same order** (both read
 * 2026-08-03). Neither list is expressed as an OpenAPI `enum` — both are prose —
 * so the agreement between two independently-written descriptions is the
 * strongest confirmation available short of an account to test against.
 *
 * The two footnotes attached to this list matter more than the list does, and
 * are surfaced on the param itself: only `Registration`, `Seller Inquiry`,
 * `Property Inquiry`, `General Inquiry` and `Visited Open House` trigger
 * **action plans**, and only the first four of those trigger **automations**.
 * Picking a type outside that set silently means "record this, but run nothing"
 * — the call still succeeds, which is what makes it hard to notice.
 */
export const EVENT_TYPES = [
  "Registration",
  "Inquiry",
  "Seller Inquiry",
  "Property Inquiry",
  "General Inquiry",
  "Viewed Property",
  "Saved Property",
  "Visited Website",
  "Incoming Call",
  "Unsubscribed",
  "Property Search",
  "Saved Property Search",
  "Visited Open House",
  "Viewed Page",
] as const;

/** Event types that trigger an action plan. See `EVENT_TYPES`. */
export const ACTION_PLAN_EVENT_TYPES = [
  "Registration",
  "Seller Inquiry",
  "Property Inquiry",
  "General Inquiry",
  "Visited Open House",
] as const;

/**
 * Call outcomes, verbatim from the `POST /calls` schema: "The outcome of the
 * call, which can be one of `Interested`, `Not Interested`, `Left Message`,
 * `No Answer`, `Busy` or `Bad Number`."
 */
export const CALL_OUTCOMES = [
  "Interested",
  "Not Interested",
  "Left Message",
  "No Answer",
  "Busy",
  "Bad Number",
] as const;

/** Deal statuses, verbatim from the `GET /deals` `status` enum. */
export const DEAL_STATUSES = ["Active", "Archived", "Deleted"] as const;

/** Build a `select` param's options from a readonly string tuple. */
export function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

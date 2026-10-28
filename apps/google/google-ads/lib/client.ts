import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Google Ads API — REST interface.
 *
 * Three things about this API shape the whole app, and each is verified rather
 * than assumed:
 *
 * 1. **It really does have a REST interface.** Every RPC in the `.proto`
 *    service definitions carries a `google.api.http` annotation, and those
 *    annotations are the authority for the paths below — not prose docs. They
 *    were read off `googleapis/googleapis`
 *    `google/ads/googleads/v25/services/*.proto` directly:
 *
 *      post: "/v25/customers/{customer_id=*}/googleAds:search"
 *      post: "/v25/customers/{customer_id=*}/googleAds:searchStream"
 *      get:  "/v25/customers:listAccessibleCustomers"
 *      post: "/v25/customers/{customer_id=*}/campaigns:mutate"
 *      post: "/v25/customers/{customer_id=*}/campaignBudgets:mutate"
 *      post: "/v25/customers/{customer_id=*}/adGroups:mutate"
 *
 * 2. **The version is a path segment and Google ships several a year.** `v25`
 *    is the current major (released 2026-07-22, per the API release notes);
 *    it is pinned here in one place so a bump is a one-line change. Note the
 *    version is NOT a host prefix and NOT a header — `googleads.googleapis.com`
 *    is the only host this app ever calls.
 *
 * 3. **Every request needs a `developer-token` header on top of the OAuth
 *    bearer**, and a manager-account call also needs `login-customer-id`.
 *    Neither is set here. Both are credentials belonging to the connecting
 *    user's Google Ads manager account, so they are collected as connection
 *    fields and stamped by the auth `sign` hook, which is the only code the
 *    runtime hands a credential. Nothing in `lib/` or `actions/` may see them.
 *
 * The `customerId` a request is *addressed to*, by contrast, is a path segment
 * an action must be able to build — so it travels the other way, recorded on
 * the Connection's redacted `display` by `afterConnect` (the pattern QuickBooks
 * uses for `realmId`) and overridable per call.
 */
export const API_HOST = "googleads.googleapis.com";

/** Current major version. Bump here and nowhere else. */
export const API_VERSION = "v25";

export const API_URL = `https://${API_HOST}/${API_VERSION}`;

/**
 * Google prints customer ids with dashes (`123-456-7890`) everywhere in its own
 * UI, but the API accepts only the bare digits in a resource name. Normalising
 * on the way in means a user can paste either.
 */
export function normalizeCustomerId(raw: string, label = "customerId"): string {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  if (!/^\d{1,20}$/.test(digits)) {
    throw new Error(`\`${label}\` must be a numeric Google Ads customer ID (dashes allowed).`);
  }
  return digits;
}

/**
 * Resolve which account a call is addressed to: an explicit per-action override
 * wins, otherwise the Connection's default recorded at connect time.
 */
export function customerIdFromConnection(
  connection: RedactedConnection | undefined,
  override?: string,
): string {
  if (override) return normalizeCustomerId(override, "customerId");
  const { customerId } = (connection?.display ?? {}) as { customerId?: string };
  if (!customerId) {
    throw new Error(
      "No customer ID: this Google Ads connection recorded none, and the action was called without a `customerId` override.",
    );
  }
  return normalizeCustomerId(customerId, "connection customerId");
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

/** `SearchGoogleAdsRequest`. `pageSize` is deliberately absent — see `search()`. */
export interface SearchRequest {
  query: string;
  pageToken?: string;
  validateOnly?: boolean;
  searchSettings?: {
    omitResults?: boolean;
    returnSummaryRow?: boolean;
    returnTotalResultsCount?: boolean;
  };
}

/** `SearchGoogleAdsResponse`. */
export interface SearchResponse<Row = Record<string, unknown>> {
  results?: Row[];
  nextPageToken?: string;
  totalResultsCount?: string;
  fieldMask?: string;
  summaryRow?: Row;
  queryResourceConsumption?: string;
}

interface GoogleAdsError {
  message?: string;
  errorCode?: Record<string, string>;
}
interface GoogleAdsFailure {
  errors?: GoogleAdsError[];
  requestId?: string;
}
interface ErrorEnvelope {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: GoogleAdsFailure[];
  };
}

/**
 * Google Ads returns the standard Google JSON error envelope
 * (`{ error: { code, message, status, details[] } }`), and puts the part that
 * actually says what went wrong inside `details[]` as a `GoogleAdsFailure` —
 * a list of `GoogleAdsError`s each carrying a granular `errorCode` (e.g.
 * `authenticationError: NOT_ADS_USER`) plus a human message. Surfacing only the
 * envelope's top-level message loses that, so both are folded in, along with
 * the `requestId` Google asks for in any support thread.
 */
export function describeError(status: number, method: string, path: string, text: string): string {
  let detail = text;
  try {
    const body = JSON.parse(text) as ErrorEnvelope;
    const parts: string[] = [];
    if (body.error?.message) parts.push(body.error.message);
    for (const failure of body.error?.details ?? []) {
      for (const e of failure.errors ?? []) {
        const code = Object.entries(e.errorCode ?? {}).map(([k, v]) => `${k}=${v}`).join(",");
        parts.push([code, e.message].filter(Boolean).join(": "));
      }
      if (failure.requestId) parts.push(`requestId=${failure.requestId}`);
    }
    if (parts.length) detail = parts.join("; ");
  } catch { /* keep the raw body */ }
  return `Google Ads ${status} for ${method} ${path}: ${detail}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization, `developer-token`
 * or `login-customer-id` — the runtime routes every request through the auth
 * `sign` hook, which is the only place a credential exists.
 */
export class GoogleAdsClient {
  constructor(private ctx: HookContext) {}

  /** The account this call is addressed to (override, else the connection default). */
  customerId(override?: string): string {
    return customerIdFromConnection(this.ctx.connection, override);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(describeError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * `GoogleAdsService.Search` — the way essentially every read in this API is
   * done. Not `searchStream`: that RPC exists and is reachable over REST, but
   * it is a server-streaming method whose HTTP body is a JSON *array* of
   * response chunks delivered over chunked transfer with no page token and no
   * way to bound the result set from the request. `ctx.fetch` hands back a
   * whole `Response`, so consuming it would mean buffering an unbounded report
   * into memory inside the sandbox and then re-stitching the chunks — strictly
   * worse than paging. `search` returns one bounded page plus a
   * `nextPageToken`, which maps cleanly onto how every other action in this
   * pack paginates, so that is what every read here uses.
   *
   * `pageSize` is not sent, and is not exposed as a param: the field is marked
   * deprecated in `SearchGoogleAdsRequest` and the API answers
   * `PAGE_SIZE_NOT_SUPPORTED` if it is present in the body. Bound a result set
   * with GAQL's own `LIMIT` instead.
   */
  search<Row = Record<string, unknown>>(
    customerId: string,
    req: SearchRequest,
  ): Promise<SearchResponse<Row>> {
    return this.request<SearchResponse<Row>>(`/customers/${customerId}/googleAds:search`, {
      method: "POST",
      body: compact({
        query: req.query,
        pageToken: req.pageToken,
        validateOnly: req.validateOnly,
        searchSettings: req.searchSettings && Object.keys(compact(req.searchSettings)).length
          ? compact(req.searchSettings)
          : undefined,
      }),
    });
  }

  /**
   * A resource-service `:mutate` call. `collection` is the REST collection
   * segment from the service's own `google.api.http` annotation — `campaigns`,
   * `campaignBudgets`, `adGroups`, … — never a guess.
   */
  mutate<T = unknown>(
    customerId: string,
    collection: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(`/customers/${customerId}/${collection}:mutate`, {
      method: "POST",
      body,
    });
  }
}

/** Drop keys the caller left unset so a sparse body never sends an explicit null. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

export interface GaqlSpec {
  select: string[];
  from: string;
  /** ANDed together. Callers must have validated anything interpolated. */
  where?: Array<string | undefined>;
  orderBy?: string;
  limit?: number;
}

/**
 * Build a GAQL statement.
 *
 * GAQL is `SELECT … FROM … [WHERE …] [ORDER BY …] [LIMIT …]` — no joins, one
 * resource per `FROM`, and every selected field is a dotted path rooted at a
 * resource, `metrics.` or `segments.`. Clause order is fixed by the grammar,
 * which is why this is a builder rather than string concatenation at each call
 * site.
 */
export function buildGaql(spec: GaqlSpec): string {
  if (!spec.select.length) throw new Error("GAQL requires at least one SELECT field.");
  let q = `SELECT ${spec.select.join(", ")} FROM ${spec.from}`;
  const where = (spec.where ?? []).filter((c): c is string => Boolean(c && c.trim()));
  if (where.length) q += ` WHERE ${where.join(" AND ")}`;
  if (spec.orderBy) q += ` ORDER BY ${spec.orderBy}`;
  if (spec.limit !== undefined) q += ` LIMIT ${spec.limit}`;
  return q;
}

/**
 * Guard a value that is about to be interpolated into a GAQL `WHERE` as a bare
 * number. Ids in this API are always integers, so anything else is a caller
 * error and is refused here rather than sent as a malformed query.
 */
export function assertNumericId(value: string | number, label: string): string {
  const s = String(value).replace(/[\s-]/g, "");
  if (!/^\d+$/.test(s)) throw new Error(`\`${label}\` must be a numeric ID.`);
  return s;
}

/**
 * Guard a value interpolated as a GAQL enum literal (`campaign.status =
 * ENABLED`). Enum names are unquoted bare words, so allowing anything else
 * would be a query-injection seam.
 */
export function assertEnum(value: string, label: string): string {
  const s = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(s)) {
    throw new Error(`\`${label}\` must be a bare GAQL enum name (A–Z, digits and underscore).`);
  }
  return s;
}

/**
 * Guard a GAQL predefined date range used with `DURING`. Google documents a
 * closed set; anything outside it is refused rather than passed through, which
 * also closes the injection seam a free-text range would open.
 */
export const DATE_RANGES = [
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "LAST_BUSINESS_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
  "THIS_WEEK_SUN_TODAY",
  "THIS_WEEK_MON_TODAY",
  "LAST_WEEK_SUN_SAT",
  "LAST_WEEK_MON_SUN",
] as const;

export function assertDateRange(value: string): string {
  const s = value.trim().toUpperCase();
  if (!(DATE_RANGES as readonly string[]).includes(s)) {
    throw new Error(`\`dateRange\` must be one of: ${DATE_RANGES.join(", ")}.`);
  }
  return s;
}

/** Guard an ISO `yyyy-MM-dd` date used in a GAQL `BETWEEN`. */
export function assertIsoDate(value: string, label: string): string {
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`\`${label}\` must be an ISO date, \`yyyy-MM-dd\`.`);
  }
  return s;
}

/** A resource name for one of this API's relative-path resources. */
export function resourceName(customerId: string, collection: string, id: string): string {
  return `customers/${customerId}/${collection}/${assertNumericId(id, "id")}`;
}

/**
 * Accept either a bare id or a full relative resource name wherever a resource
 * reference is asked for.
 *
 * Google Ads uses *relative* resource names (`customers/1234567890/campaigns/42`)
 * rather than the full `//service/…` form other Google APIs use, and every read
 * in this app hands them back in exactly that shape. So a user copying a value
 * out of one action's output into another's input should not have to strip it
 * back down to an id — but typing the id alone is the obvious thing to do, and
 * both have to work.
 */
export function resolveResourceName(
  customerIdValue: string,
  collection: string,
  value: string,
  label: string,
): string {
  const v = value.trim();
  if (v.startsWith("customers/")) return v;
  return `customers/${customerIdValue}/${collection}/${assertNumericId(v, label)}`;
}

/**
 * Parse a JSON-typed param into a plain object, so a typo fails here with a
 * useful message rather than as an opaque 400 from Google.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Split a comma-separated list of GAQL field paths (used for `updateMask` and
 * for extra SELECT fields), rejecting anything that is not a dotted path so a
 * mask can never carry a fragment of a query.
 */
export function fieldPaths(raw: string | undefined, label: string): string[] {
  if (!raw) return [];
  return raw.split(",").map((f) => f.trim()).filter(Boolean).map((f) => {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(f)) {
      throw new Error(`\`${label}\` entry \`${f}\` is not a valid field path.`);
    }
    return f;
  });
}

import type { HookContext } from "@w6w/types";

/**
 * Jobber is GraphQL-only. There is no REST surface: every call is a POST to
 * this one endpoint with a `{ query, variables }` JSON body.
 *
 * Verified on the wire 2026-08-03 — an unauthenticated POST here answers
 * HTTP 200 with `{"errors":[{"message":"The field account on an object of type
 * Query was hidden because you are unauthenticated", ..., "extensions":
 * {"code":"UNAUTHENTICATED"}}],"data":{"account":null}}`.
 */
export const API_URL = "https://api.getjobber.com/api/graphql";

/**
 * Jobber versions its schema by date and **requires** the version on every
 * request — "Specifying a version in the header is required for all apps"
 * (API Versioning). The header is transport metadata, not a credential, so the
 * client owns it rather than the `sign` hook.
 *
 * `2025-04-16` is the newest version in Jobber's changelog as of 2026-08-03 and
 * is what Jobber's own `curl` examples send. It is pinned rather than floated
 * on purpose: an unpinned integration inherits breaking changes silently, which
 * is the exact failure the header exists to prevent.
 *
 * Jobber supports a version "for a minimum of 12 months" and keeps it reachable
 * "for up to 18 months from their release date". Once a version is removed the
 * request is *not* rejected — it is "automatically upgraded to the next
 * supported version", so a stale pin degrades into a silent schema change
 * rather than a loud error. Read `extensions.versioning.warning` off a response
 * (see `send`) to find out before that happens.
 */
export const API_VERSION = "2025-04-16";

/** The header's exact name. Jobber accepts no alias. */
export const API_VERSION_HEADER = "x-jobber-graphql-version";

/** A transport-level GraphQL error — the `errors[]` entries beside `data`. */
export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
  extensions?: { code?: string; [k: string]: unknown };
}

/**
 * Jobber's query-cost meter, returned under `extensions.cost` on every
 * authenticated response. `health/quota.ts` is the consumer.
 */
export interface ThrottleStatus {
  maximumAvailable?: number;
  currentlyAvailable?: number;
  restoreRate?: number;
}

export interface CostExtension {
  requestedQueryCost?: number;
  actualQueryCost?: number;
  throttleStatus?: ThrottleStatus;
}

export interface JobberExtensions {
  cost?: CostExtension;
  versioning?: { version?: string; warning?: string };
  [k: string]: unknown;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: JobberExtensions;
}

/**
 * A mutation payload. **Every** Jobber mutation returns one of these:
 * `userErrors: [MutationErrors!]!` sits beside the created/edited record, and
 * a rejected write arrives as HTTP 200, no `errors[]`, an empty record and a
 * populated `userErrors`. See `unwrap`.
 */
export interface MutationError {
  message: string;
  path?: string[];
}

/** Drop variables the caller left unset so they never reach Jobber as nulls. */
export function compact<T extends Record<string, unknown>>(vars: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Compact a nested input object and drop it entirely when nothing is set.
 *
 * Used for `filter:` arguments. Sending `filter: {}` works, but sending
 * `filter: { clientId: null }` does not mean "any client" — a null-valued
 * filter key is a filter. Dropping the argument is the only spelling of
 * "no filter" that is unambiguous.
 */
export function optionalInput<T extends Record<string, unknown>>(
  vars: T,
): Record<string, unknown> | undefined {
  const out = compact(vars);
  return Object.keys(out).length ? out : undefined;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse a `type: "json"` param into an object, with a message that names the
 * field rather than letting Jobber reject an opaque payload.
 */
export function jsonArg(v: unknown, field: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object") return v as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(v));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${field} must be a JSON object`);
  }
}

/**
 * Build an `Iso8601DateTimeRangeInput` from two optional bounds.
 *
 * Jobber's own description: "use either `eq` or `min` and `max`, but not both"
 * — the field names on the wire are `after` / `before` / `eq`. Returns
 * `undefined` when neither bound is set so `compact` can drop the filter.
 */
export function dateRange(after?: string, before?: string): Record<string, string> | undefined {
  const range: Record<string, string> = {};
  if (after) range.after = after;
  if (before) range.before = before;
  return Object.keys(range).length ? range : undefined;
}

/** Build a `{ key, direction }` sort input, or leave sorting to Jobber. */
export function sortInput(
  key: string | undefined,
  direction: string | undefined,
): { key: string; direction: string } | undefined {
  if (!key) return undefined;
  return { key, direction: direction === "ASCENDING" ? "ASCENDING" : "DESCENDING" };
}

/**
 * Thin GraphQL client over `ctx.fetch`.
 *
 * It never sets `Authorization` — the runtime routes every request through the
 * auth `sign` hook — but it does set `X-JOBBER-GRAPHQL-VERSION`, which is
 * transport metadata, not a credential.
 *
 * ## Three failure channels, only one of which is an HTTP status
 *
 * 1. **HTTP status.** 401 for a dead token, 429 once the DDoS middleware's
 *    2500-requests-per-5-minutes bucket is empty. Rare.
 * 2. **`errors[]` with HTTP 200.** The normal way a Jobber request fails:
 *    unauthenticated, unauthorised, a bad argument, or `THROTTLED` when the
 *    query cost exceeds the account's remaining points. `data` is present but
 *    the requested field is `null`, so an integration that only checks
 *    `res.ok` reads a failure as a success carrying `undefined`.
 * 3. **`userErrors[]` inside a mutation payload, with HTTP 200 and no
 *    `errors[]`.** Business-rule rejections. `unwrap` handles those; `query`
 *    cannot, because it does not know which field of `data` is the payload.
 *
 * `query` closes (1) and (2). Every mutation action closes (3) with `unwrap`.
 */
export class JobberClient {
  constructor(private ctx: HookContext) {}

  /**
   * The raw round-trip: validates the transport but hands back the whole
   * envelope, so a caller that wants `extensions` (the cost meter, the version
   * warning) can read it. Throws on channels (1) and (2).
   */
  async send<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse<T>> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        [API_VERSION_HEADER]: API_VERSION,
      },
      body: JSON.stringify({ query, variables: compact(variables) }),
    });

    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(`Jobber ${res.status} ${res.statusText}: non-JSON response`);
    }

    if (payload.errors?.length) {
      // Surface the throttle case by name — it is the one GraphQL error a
      // workflow author can act on (wait, then retry) rather than fix.
      const throttled = payload.errors.some((e) => e.extensions?.code === "THROTTLED");
      const detail = payload.errors.map((e) => e.message).join("; ");
      const available = payload.extensions?.cost?.throttleStatus?.currentlyAvailable;
      throw new Error(
        throttled
          ? `Jobber throttled the query (cost exceeded the account's remaining points${
            available === undefined ? "" : `, ${available} available`
          }): ${detail}`
          : `Jobber GraphQL error: ${detail}`,
      );
    }
    if (!res.ok) throw new Error(`Jobber ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined || payload.data === null) {
      throw new Error("Jobber returned no data");
    }

    // Jobber warns here for a version approaching (or past) end of support.
    // A log line is the right volume: it is not this request's problem, but a
    // silent auto-upgrade to another schema later is worse.
    const warning = payload.extensions?.versioning?.warning;
    if (warning) this.ctx.log("warn", `Jobber API version warning: ${warning}`);

    return payload;
  }

  /** The common case: the validated `data` object. */
  async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const payload = await this.send<T>(query, variables);
    return payload.data as T;
  }
}

/**
 * Pull a mutation payload out of `data` and fail loudly on `userErrors`.
 *
 * This is the third failure channel and the easiest to miss, because nothing
 * about the response looks wrong: HTTP 200, no `errors[]`, a well-formed body.
 * The record is simply `null` and the reason sits in a sibling array.
 *
 * ```jsonc
 * { "data": { "clientCreate": { "client": null,
 *     "userErrors": [{ "message": "First name can't be blank", "path": ["firstName"] }] } } }
 * ```
 *
 * Every mutation action routes through here, so a rejected write raises rather
 * than returning a hollow success.
 */
export function unwrap<T extends Record<string, unknown>>(
  data: Record<string, unknown> | undefined,
  field: string,
): T {
  const payload = data?.[field] as (T & { userErrors?: MutationError[] }) | undefined;
  if (!payload) throw new Error(`Jobber returned no ${field} payload`);

  const userErrors = payload.userErrors ?? [];
  if (userErrors.length) {
    const detail = userErrors
      .map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message))
      .join("; ");
    throw new Error(`Jobber rejected ${field}: ${detail}`);
  }
  return payload;
}

/**
 * Shared field selections.
 *
 * Every object in Jobber's API carries an `id` of type `EncodedId` — a base64
 * string such as `Z2lkOi8vSm9iYmVyL0NsaWVudC8xMTkxOTUzNDA` that decodes to
 * `gid://Jobber/Client/119195340`. Ids are strings, never integers, and an id
 * returned by one query is the argument another takes verbatim.
 *
 * Selections are deliberately shallow. Jobber prices a query at one point per
 * field, multiplied through connections by the `first`/`last` argument, so a
 * convenient `client { jobs { nodes { ... } } }` on a 100-row page is how an
 * integration exhausts a 10,000-point budget in one call.
 */
export const ADDRESS_FIELDS = `
  street1
  street2
  city
  province
  postalCode
  country
`;

export const CLIENT_FIELDS = `
  id
  name
  firstName
  lastName
  companyName
  isCompany
  isLead
  isArchived
  balance
  title
  emails { id address description primary }
  phones { id number description primary smsAllowed }
  billingAddress { ${ADDRESS_FIELDS} }
  jobberWebUri
  createdAt
  updatedAt
`;

export const PROPERTY_FIELDS = `
  id
  name
  address { id ${ADDRESS_FIELDS} }
  routingOrder
  jobberWebUri
`;

export const REQUEST_FIELDS = `
  id
  title
  requestStatus
  source
  companyName
  contactName
  email
  phone
  client { id name }
  property { id address { ${ADDRESS_FIELDS} } }
  jobberWebUri
  createdAt
  updatedAt
`;

export const QUOTE_FIELDS = `
  id
  quoteNumber
  quoteStatus
  title
  message
  amounts { subtotal discountAmount taxAmount total depositAmount outstandingDepositAmount }
  client { id name }
  property { id address { ${ADDRESS_FIELDS} } }
  clientHubUri
  jobberWebUri
  sentAt
  transitionedAt
  createdAt
  updatedAt
`;

export const JOB_FIELDS = `
  id
  jobNumber
  jobStatus
  jobType
  title
  instructions
  total
  invoicedTotal
  uninvoicedTotal
  billingType
  startAt
  endAt
  completedAt
  client { id name }
  property { id address { ${ADDRESS_FIELDS} } }
  jobberWebUri
  createdAt
  updatedAt
`;

export const VISIT_FIELDS = `
  id
  title
  instructions
  visitStatus
  isComplete
  allDay
  startAt
  endAt
  duration
  completedAt
  client { id name }
  job { id jobNumber jobberWebUri }
`;

export const INVOICE_FIELDS = `
  id
  invoiceNumber
  invoiceStatus
  subject
  message
  amounts { subtotal discountAmount taxAmount total paymentsTotal invoiceBalance }
  dueDate
  issuedDate
  receivedDate
  client { id name }
  clientHubUri
  jobberWebUri
  createdAt
  updatedAt
`;

export const PRODUCT_FIELDS = `
  id
  name
  description
  category
  defaultUnitCost
  internalUnitCost
  markup
  taxable
  visible
  durationMinutes
  onlineBookingsEnabled
`;

export const USER_FIELDS = `
  id
  uuid
  name { first last full }
  email { raw isValid }
  phone { friendly }
  status
  isAccountOwner
  isAccountAdmin
`;

/**
 * The Relay page envelope every collection query returns.
 *
 * Jobber's pagination is cursor-based ("based on the Relay framework"): pass
 * `first` with an optional `after`, read `pageInfo.endCursor` off the response
 * and hand it back as `after` on the next call. `hasNextPage` is the loop
 * condition — an empty `nodes` array is not, because a filtered page can be
 * empty while more pages remain.
 *
 * `totalCount` is deliberately NOT selected. Jobber's own schema warns:
 * "Please use with caution. Using totalCount raises the likelyhood you will be
 * throttled" [sic].
 */
export const PAGE_INFO = `
  pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
`;

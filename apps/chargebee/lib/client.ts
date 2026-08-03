/**
 * Chargebee API v2 — verified against the vendor's own sources on 2026-08-03:
 *
 *   - the docs site, <https://apidocs.chargebee.com/docs/api> and the
 *     per-operation pages under it (every page is also served as Markdown by
 *     appending `.md`, which is how the wire samples quoted below were read);
 *   - Chargebee's published OpenAPI 3.1 document,
 *     <https://github.com/chargebee/openapi> — file
 *     `spec/chargebee_api_v2_pc_v2_spec.json`, `info.version`
 *     `2026-07-30.26c7bd26…`, which is what generates those docs;
 *   - the official client libraries, where the wire format is unambiguous code
 *     rather than prose (`chargebee-python/chargebee/util.py#serialize`,
 *     `chargebee-node/src/util.ts#encodeParams`).
 *
 * Three things about this API are unusual enough to be worth stating up front,
 * because getting any of them wrong produces a silent 400 rather than an error
 * that names itself.
 *
 * ## 1. The host is per-customer
 *
 * There is no single `api.chargebee.com`. Every Chargebee account ("site") gets
 * its own subdomain, and the OpenAPI document's only `servers` entries are
 * templates over it:
 *
 *   `{protocol}://{site}.{environment}:{port}/api/v2`     (environment: chargebee.com)
 *   `{protocol}://{site}-test.{environment}:{port}/api/v2`
 *
 * So a live site is `https://acme.chargebee.com/api/v2` and its test site is
 * `https://acme-test.chargebee.com/api/v2` — a *different site name*, not a flag.
 *
 * The site name is therefore a property of the CONNECTION, not of a call. It is
 * collected once as an Auth field, republished as `connection.display.site` by
 * `afterConnect`, and turned into a base URL here — the same shape `wordpress`,
 * `ghost` and `gravityforms` use for their per-tenant hosts. Actions only ever
 * see the redacted Connection, never the credential.
 *
 * Unlike those three, the apex is known at publish time, so the manifest can
 * declare the narrow wildcard `"*.chargebee.com"` (the form the spec defines as
 * "any subdomain at any depth, NOT the apex") rather than the blanket `"*"`.
 * `zendesk` in this pack takes the same posture for the same reason.
 *
 * ## 2. Requests are form-encoded, not JSON
 *
 * Chargebee's getting-started page states it in one line — "It's a REST API that
 * uses HTTP Basic Auth, accepts form-encoded requests, and returns JSON" — and
 * every write operation in the OpenAPI document declares exactly one request
 * content type, `application/x-www-form-urlencoded`. There is no JSON request
 * body anywhere in the v2 surface. Posting JSON gets a 400 that does not explain
 * itself.
 *
 * Nested and repeated fields ride in BRACKET notation. See `formEntries` below
 * for the exact rules and the vendor samples that pin them.
 *
 * ## 3. Product Catalog 2.0 only
 *
 * Chargebee ships two mutually exclusive catalog models, and a site is on one or
 * the other. They are different API surfaces, not different options: the
 * `chargebee_api_v2_pc_v1_spec` document has `/plans` and `POST /subscriptions`
 * and NO `/items`, `/item_prices` or `/customers/{id}/subscription_for_items`;
 * the PC 2.0 document is the reverse.
 *
 * This App implements **Product Catalog 2.0**, which is what Chargebee documents
 * as current. On a PC 1.0 site the customer, invoice, payment-source and event
 * actions still work, but every subscription and catalog action 404s. The auth
 * `test` hook reads `GET /configurations` (which reports
 * `product_catalog_version`) and says so rather than letting that surface as a
 * mystery 404 later.
 */
import type { HookContext } from "@w6w/types";

/** The API path prefix, identical on every site. */
export const API_PATH = "/api/v2";

/**
 * The apex every Chargebee site lives under. Kept as a bare hostname rather
 * than a URL so no absolute URL literal exists in this file — the only host
 * this app talks to is computed from the Connection, and `w6w.network.allow`
 * declares the wildcard that covers it.
 */
export const CHARGEBEE_DOMAIN = "chargebee.com";

/**
 * Public (redacted-safe) connection metadata. The auth method's `afterConnect`
 * hook publishes this onto `connection.display` so action code can compute the
 * base URL without ever touching the credential.
 */
export interface ChargebeeConnectionDisplay {
  /** Bare site name, e.g. `acme` or `acme-test`. Never a URL. */
  site?: string;
  /** `"v1"` or `"v2"`, as reported by `GET /configurations`. */
  productCatalogVersion?: string;
  /** The site's configured domain, straight from `GET /configurations`. */
  domain?: string;
}

/**
 * Normalise whatever the user pasted into a bare site name.
 *
 * People supply this three ways and all three are reasonable: the site name on
 * its own (`acme`), the API host (`acme.chargebee.com`), or the whole base URL
 * copied out of a doc example (`https://acme.chargebee.com/api/v2`). Each
 * reduces to the same site.
 *
 * Note what is deliberately NOT stripped: a `-test` suffix. `acme-test` is a
 * genuinely different site with its own data and its own API key, so silently
 * folding it into `acme` would point every request at production.
 */
export function normalizeSite(raw: string): string {
  let site = String(raw ?? "").trim().toLowerCase();
  site = site.replace(/^https?:\/\//, "");
  // Drop anything from the first `/` on — path, query, the `api/v2` suffix.
  site = site.replace(/[/?#].*$/, "");
  site = site.replace(new RegExp(`\\.${CHARGEBEE_DOMAIN.replace(/\./g, "\\.")}$`), "");
  return site.replace(/^\.+|\.+$/g, "");
}

/**
 * A site name must be a single DNS label — it becomes a subdomain.
 *
 * Rejecting a dotted value here rather than at request time is the difference
 * between a clear "that is not a site name" at connect time and an opaque
 * egress denial from the sandbox much later: a value like `evil.example.com`
 * would otherwise be interpolated into `evil.example.com.chargebee.com`, which
 * is at least still inside the allowlist, or — worse, if the shape ever changed
 * — outside it.
 */
export function isValidSite(site: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(site);
}

/** `acme` -> `acme.chargebee.com`. Throws on anything that is not a bare label. */
export function apiHost(site: string): string {
  const normalized = normalizeSite(site);
  if (!normalized) throw new Error("Chargebee connection is missing a site name");
  if (!isValidSite(normalized)) {
    throw new Error(
      `"${normalized}" is not a Chargebee site name — expected a single label such as \`acme\` ` +
        "or `acme-test`",
    );
  }
  return `${normalized}.${CHARGEBEE_DOMAIN}`;
}

/** `{ site: "acme" }` -> `https://acme.chargebee.com/api/v2`. */
export function resolveApiUrl(display: ChargebeeConnectionDisplay | undefined): string {
  return `https://${apiHost(display?.site ?? "")}${API_PATH}`;
}

// ------------------------------------------------------------ form encoding --

export type FormPrimitive = string | number | boolean;
export type FormValue =
  | FormPrimitive
  | null
  | undefined
  | ReadonlyArray<FormValue>
  | { readonly [key: string]: FormValue };

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === "";

/**
 * Top-level parameters Chargebee reads as a JSON *string* rather than as
 * bracketed sub-keys.
 *
 * This is not a guess: the official SDKs carry an explicit `jsonKeys` map per
 * operation, keyed by param name and the nesting level it applies at, and
 * JSON-stringify exactly those. `chargebee-python`'s customer `create` declares
 * `{"exemption_details": 0, "meta_data": 0, "additional_information": 1,
 * "billing_address": 1}`; the subscription operations declare `meta_data` at
 * level 0 too. `meta_data` is the only one of those this App exposes, so it is
 * the only one listed — the set is deliberately narrow rather than a guess at
 * the whole family.
 */
export const JSON_ENCODED_KEYS: ReadonlySet<string> = new Set(["meta_data"]);

/**
 * Flatten a parameter map into Chargebee's form-encoded wire shape.
 *
 * The rules mirror `chargebee-python/chargebee/util.py#serialize` and
 * `chargebee-node/src/util.ts#encodeParams` exactly, and each is pinned by a
 * sample in Chargebee's own docs:
 *
 *   - **scalar** -> `key=value`
 *     `-d first_name="John"`
 *   - **object** -> `key[sub]=value`, one bracket per level
 *     `-d "billing_address[city]"="Walnut"`
 *   - **array**  -> `key[i]=value`, zero-based
 *     `-d "coupon_ids[0]"="EARLYBIRD"`
 *   - **object of arrays** -> `key[sub][i]=value` — the multi-line form
 *     `-d "subscription_items[item_price_id][0]"="basic-USD"`
 *     `-d "subscription_items[quantity][0]"=1`
 *     `-d "subscription_items[item_price_id][1]"="day-pass-USD"`
 *   - **booleans** go out lowercase (`true` / `false`), matching `get_val`.
 *
 * Two decisions worth naming, because both are load-bearing:
 *
 *  1. **Array indices are positional and are NOT re-packed.** Chargebee's
 *     multi-value form is COLUMNAR — one array per field, correlated by index —
 *     so `subscription_items[quantity][1]` belongs to
 *     `subscription_items[item_price_id][1]`. Re-indexing after dropping an
 *     empty (which is what a filter-then-enumerate would do) would silently
 *     re-pair a quantity with the wrong item price. Empties are skipped in
 *     place; the surviving entries keep their original index.
 *  2. **Empty, null and undefined values are dropped entirely** rather than
 *     sent blank. An unfilled optional form field must not blank a stored value
 *     on an update. The cost is that this App cannot clear a field by sending
 *     an empty string; that is the safer side to err on, and it is stated in
 *     the README rather than hidden here.
 */
export function formEntries(params: Record<string, FormValue>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (JSON_ENCODED_KEYS.has(key)) {
      if (isEmpty(value)) continue;
      out.push([key, typeof value === "string" ? value : JSON.stringify(value)]);
      continue;
    }
    encodeInto(out, key, value);
  }
  return out;
}

function encodeInto(out: Array<[string, string]>, key: string, value: FormValue): void {
  if (isEmpty(value)) return;

  if (Array.isArray(value)) {
    // Index preserved, not re-packed — see rule (1) above.
    value.forEach((v, i) => encodeInto(out, `${key}[${i}]`, v));
    return;
  }

  if (typeof value === "object") {
    for (const [sub, v] of Object.entries(value as Record<string, FormValue>)) {
      encodeInto(out, `${key}[${sub}]`, v);
    }
    return;
  }

  out.push([key, typeof value === "boolean" ? String(value) : String(value)]);
}

/** `formEntries`, serialised. Brackets are percent-encoded, exactly as the official SDKs do. */
export function encodeForm(params: Record<string, FormValue>): string {
  const body = new URLSearchParams();
  for (const [k, v] of formEntries(params)) body.append(k, v);
  return body.toString();
}

/**
 * Transpose the row-wise shape a person writes into the columnar shape
 * Chargebee reads.
 *
 * A workflow author naturally describes line items row-wise:
 *
 *   `[{ "item_price_id": "basic-USD", "quantity": 1 }, { "item_price_id": "day-pass-USD" }]`
 *
 * Chargebee wants them columnar, correlated by index:
 *
 *   `subscription_items[item_price_id][0]=basic-USD`
 *   `subscription_items[quantity][0]=1`
 *   `subscription_items[item_price_id][1]=day-pass-USD`
 *
 * A row that omits a key leaves a HOLE at that index rather than shifting the
 * column up — `formEntries` skips the empty and keeps every other index where
 * it was, so `item_price_id[1]` still lines up with its own row.
 */
export function transposeRows(
  rows: ReadonlyArray<Record<string, FormValue>>,
): Record<string, FormValue[]> {
  const columns: Record<string, FormValue[]> = {};
  rows.forEach((row, i) => {
    for (const [key, value] of Object.entries(row ?? {})) {
      (columns[key] ??= [])[i] = value;
    }
  });
  return columns;
}

/**
 * Coerce the `json` param a user supplies into an array of rows.
 *
 * Accepts a JSON string (what a text field yields), a single object (one line
 * item, the common case), or an array. Anything else is rejected loudly — a
 * silently ignored line-item list would create an empty subscription.
 */
export function asRows(value: unknown, label: string): Array<Record<string, FormValue>> {
  if (isEmpty(value)) return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${label} must be an object or an array of objects`);
    }
  }
  return rows as Array<Record<string, FormValue>>;
}

/**
 * Coerce a `json` param into a plain object (used for `meta_data` and address
 * blocks). Returns `undefined` for an empty value so the key drops out entirely.
 */
export function asObject(value: unknown, label: string): Record<string, FormValue> | undefined {
  if (isEmpty(value)) return undefined;
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, FormValue>;
}

/**
 * Coerce a `json` param into an array of scalars (used for `coupon_ids`).
 * Also accepts a comma-separated string, which is what people type.
 */
export function asList(value: unknown, label: string): FormPrimitive[] | undefined {
  if (isEmpty(value)) return undefined;
  if (Array.isArray(value)) return value as FormPrimitive[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    // A `{`-leading string is a JSON object someone meant to be a list. Splitting
    // it on commas would produce plausible-looking garbage ids, so it is
    // rejected rather than mangled.
    if (trimmed.startsWith("{")) throw new Error(`${label} must be a JSON array`);
    if (trimmed.startsWith("[")) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new Error(`${label} is not valid JSON`);
      }
      if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array`);
      return parsed as FormPrimitive[];
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  throw new Error(`${label} must be an array or a comma-separated string`);
}

// --------------------------------------------------------------- filtering --

/**
 * Chargebee's list filters are OPERATOR objects, not bare values. The docs spell
 * each one out per parameter — "Supported operators: is, is_not, starts_with,
 * in, not_in", with the example `customer_id[is] = "8gsnbYfsMLds"` — and the
 * OpenAPI document types every one of them as a `deepObject`.
 *
 * A bare `?customer_id=abc` is not a narrower filter; it is a different thing
 * the API does not define. So every filter this App exposes is mapped through
 * one of these helpers rather than passed through.
 */
export const filterIs = (value: FormPrimitive | undefined | null): FormValue =>
  isEmpty(value) ? undefined : { is: value };

/**
 * Timestamp filters take `after` / `before` / `on` / `between`, in Unix epoch
 * SECONDS.
 *
 * A two-sided range uses `between`, NOT `after` plus `before`. Chargebee
 * documents `between` for exactly this and gives it a strict wire format — the
 * OpenAPI document types the value as a string matching
 * `^\[\d{10},\d{10}\]$`, i.e. the literal text `[1435054328,1435154328]` with no
 * spaces. Sending `after` and `before` together is nowhere documented as
 * combining, so this helper does not gamble on it.
 */
export function filterDateRange(
  after: number | undefined | null,
  before: number | undefined | null,
): FormValue {
  const hasAfter = !isEmpty(after);
  const hasBefore = !isEmpty(before);
  if (hasAfter && hasBefore) return { between: `[${after},${before}]` };
  if (hasAfter) return { after };
  if (hasBefore) return { before };
  return undefined;
}

/** `sort_by[asc]=created_at` / `sort_by[desc]=created_at`. */
export function sortBy(
  attribute: string | undefined | null,
  order: "asc" | "desc" | undefined | null,
): FormValue {
  if (isEmpty(attribute)) return undefined;
  return { [order === "desc" ? "desc" : "asc"]: attribute };
}

// ------------------------------------------------------------- list shapes --

/**
 * Every list endpoint returns the same envelope, stated verbatim on the
 * getting-started page: "Lists are returned as `{ "list": [ ... ] }`" and "If
 * `next_offset` is present, additional results are available. Pass this value as
 * the `offset` parameter in the next request".
 *
 * `next_offset` is an OPAQUE STRING, not a row count. The OpenAPI document types
 * `offset` as `string` with `maxLength: 1000`, which is why this App surfaces it
 * as a string param and never does arithmetic on it.
 */
export interface ChargebeeList<T = unknown> {
  list: T[];
  next_offset?: string;
}

/** The `Param[]` fragment every list action reuses, so paging looks identical everywhere. */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Results per page. Chargebee defaults to 10 and caps this at 100.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "offset",
    label: "Offset",
    type: "string" as const,
    hint:
      "Opaque pagination cursor. Pass the `next_offset` returned by the previous call — it is a " +
      "token, not a row number, so do not compute it.",
  },
];

/** The `output` fragment every list action reuses. */
export const PAGE_OUTPUT = [
  { key: "list", type: "array" as const, label: "Results" },
  { key: "next_offset", type: "string" as const, label: "Cursor for the next page, if any" },
];

/** `sort_by` order options, shared by every list action that supports sorting. */
export const SORT_ORDER_PARAM = {
  key: "sortOrder",
  label: "Sort order",
  type: "select" as const,
  options: [
    { value: "asc", label: "Ascending (earliest first)" },
    { value: "desc", label: "Descending (latest first)" },
  ],
  default: "asc",
  hint: "Applies only when a sort attribute is chosen.",
};

// ------------------------------------------------------------------ client --

export interface RequestOptions {
  method?: string;
  /** Query parameters, encoded with the same bracket rules as a form body. */
  query?: Record<string, FormValue>;
  /** Form body. Present => the request is POSTed as `application/x-www-form-urlencoded`. */
  form?: Record<string, FormValue>;
}

/**
 * Chargebee's error envelope. The error-handling page names the fields:
 * "Error responses include a JSON body with `api_error_code`, `message`, and
 * `http_status_code` to help you debug."
 */
interface ChargebeeError {
  message?: string;
  type?: string;
  api_error_code?: string;
  error_code?: string;
  http_status_code?: number;
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
export class ChargebeeClient {
  constructor(private ctx: HookContext, private apiUrl: string) {}

  /** Build a client for the site recorded on the Connection's redacted display data. */
  static fromConnection(ctx: HookContext): ChargebeeClient {
    const display = (ctx.connection?.display ?? {}) as ChargebeeConnectionDisplay;
    return new ChargebeeClient(ctx, resolveApiUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    for (const [k, v] of formEntries(options.query ?? {})) url.searchParams.append(k, v);

    const method = (options.method ?? (options.form ? "POST" : "GET")).toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };

    if (options.form !== undefined) {
      // The one content type the v2 surface accepts for writes.
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeForm(options.form);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      let parsed: ChargebeeError | undefined;
      try {
        parsed = text ? JSON.parse(text) as ChargebeeError : undefined;
      } catch {
        // Non-JSON body (a proxy page, an empty 502) — fall through to the status.
      }
      const code = parsed?.api_error_code ?? parsed?.error_code;
      const detail = parsed?.message ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(
        `Chargebee ${res.status}${
          code ? ` (${code})` : ""
        } for ${method} ${url.pathname}: ${detail}`,
      );
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Chargebee returned a non-JSON body for ${method} ${url.pathname}: ${text.slice(0, 200)}`,
      );
    }
  }
}

/**
 * Percent-encode a path segment, keeping `/` intact.
 *
 * Chargebee ids are caller-chosen strings (`id` is an optional input on create),
 * so they can legitimately contain characters that would otherwise change the
 * route. The official Node SDK does exactly this — `encodeURIComponent(id)`
 * with `%2F` mapped back to `/`.
 */
export function pathId(id: string): string {
  return encodeURIComponent(String(id ?? "")).replace(/%2F/g, "/");
}

import type { HookContext } from "@w6w/types";

/**
 * Housecall v1 public API client (`api.housecallpro.com`).
 *
 * Everything in this module was verified on 2026-08-11 against Housecall Pro's
 * own OpenAPI 3.0 document — `reference/housecall.v1.yaml`, 222,172 bytes,
 * `info.title` "Housecall v1 API" — fetched from the vendor's Stoplight project
 * at
 * `https://stoplight.io/api/v1/projects/housecallpro/housecall-public-api/nodes/reference/housecall.v1.yaml`,
 * plus the four prose pages in the same project (`docs/authentication.md`,
 * `docs/changelog.md`, `docs/franchise.md`, `docs/webhooks.md`) and live probes
 * against `api.housecallpro.com`. Nothing here came from a third-party
 * integration directory. See the README for how that document was located —
 * `docs.housecallpro.com` serves a 449 KB JavaScript shell for every path,
 * including its 404s.
 *
 * ## One host, no version prefix
 *
 * The document declares exactly one server, `https://api.housecallpro.com`, and
 * paths hang directly off it — `/customers`, `/jobs`, `/company`. There is no
 * `/v1` prefix and no regional or sandbox host, so nothing about the origin is
 * derived from the credential.
 *
 * The one exception is real and is in the vendor's own paths: four operations
 * carry a literal `/api` prefix (`/api/invoices/{uuid}`,
 * `/api/price_book/...`). That is not a base-path split, it is how those routes
 * are spelled, and {@link API_BASE} is deliberately the bare origin so a path
 * can say so.
 *
 * ## Three pagination envelopes, not one
 *
 * Getting this wrong is the fastest way to silently read zero rows:
 *
 *  1. **The core envelope** — `{page, page_size, total_pages, total_items,
 *     <collection>: [...]}`, where `<collection>` is the *plural resource name*
 *     and differs per endpoint (`customers`, `jobs`, `estimates`, `leads`,
 *     `employees`, `events`, `tags`, `invoices`, `line_items`, `statuses`,
 *     `lead_sources`, `job_types`, `service_zones`).
 *  2. **The price-book envelope** — `{object, page, page_size,
 *     total_pages_count, total_count, data: [...], url}`. Different count field
 *     names *and* a generic `data` key. Used by `/api/price_book/materials` and
 *     `/api/price_book/material_categories`.
 *  3. **No envelope at all** — `GET /jobs/{job_id}/line_items` answers
 *     `{url, data: [...]}`, `GET /jobs/{job_id}/appointments` answers
 *     `{appointments: [...]}`, `GET /jobs/{job_id}/invoices` answers
 *     `{invoices: [...]}` and `GET /api/price_book/services` answers
 *     `{services: [...]}` — no page, no totals.
 *
 * {@link normalizeList} folds all three into one `{items, page, pageSize,
 * totalPages, totalItems}` shape so a workflow that loops a page cursor does not
 * have to branch per endpoint. The vendor's own fields are still returned
 * verbatim alongside it.
 *
 * ## Array query parameters use the bracketed form
 *
 * The document is internally inconsistent about this and the choice is
 * deliberate. `GET /api/price_book/services` is the only place the vendor spells
 * the wire format out, and it does so twice — the parameter description says
 * "Sent as repeated `expand[]` query params (e.g.
 * `expand[]=service_materials&expand[]=service_labor_rates`)", and the
 * 2026-06-29 changelog entry repeats it. Its sibling `filters` parameter is
 * `style: deepObject` over `filters[][property]`, also bracketed. Yet that same
 * `expand` parameter *also* carries `style: form, explode: true`, which is OAS
 * for the unbracketed `expand=a&expand=b`, and every other array parameter in
 * the document declares no style at all (so OAS defaults it to the unbracketed
 * form).
 *
 * This app sends `name[]=a&name[]=b` everywhere. The prose wins because the
 * backend is Rails — `Authorization: Token`, Doorkeeper at `/oauth/token`,
 * `x-runtime` and `x-request-id` response headers, all observed live — and
 * Rack's parser keeps only the **last** value of a repeated bare key while
 * `name[]` is precisely its array syntax. Under the machine-readable reading a
 * two-value filter would silently narrow to one value and still return 200,
 * which is the worst available failure mode. See {@link buildQuery}.
 *
 * ## Errors arrive in five shapes
 *
 * There is no single error schema. Measured on the wire and read off the
 * document's own response bodies:
 *
 *  1. `{"message": "Unauthorized"}` — every 401, live-verified.
 *  2. `{"error": {"message": "..."}}` — `components.schemas.ErrorResponse`
 *     (job lock 404, lead line-items 404, estimate-option 404).
 *  3. `{"errors": {"field": ["is invalid"]}}` — 422 validation.
 *  4. `{"message": "...", "attr1": ["..."]}` — 400 with per-attribute detail.
 *  5. `{"error": "..."}` — a bare string, on `PUT /pipeline/statuses` 404.
 *
 * {@link formatHousecallError} reads all five rather than assuming one, because
 * a flattened "HTTP 422" throws away the field name that says what to fix.
 *
 * ## Multi-location
 *
 * `X-Company-Id` selects which location in a franchise hierarchy a request
 * applies to. The vendor recommends it over the older `location_ids` query
 * parameter and states that when both are sent, `location_ids` is ignored — so
 * this app exposes only the header (see `lib/params.ts#companyIdParam`) and no
 * `location_ids` parameter at all.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.housecallpro.com";

/**
 * The multi-location selector header.
 *
 * Documented in `docs/franchise.md`: an API key reaches its own location and
 * every location beneath it, and this header picks which one a request applies
 * to. Sending it makes the API ignore `location_ids` entirely.
 */
export const COMPANY_ID_HEADER = "x-company-id";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Value for the `X-Company-Id` multi-location header. */
  companyId?: string;
}

/** The core pagination envelope, shared by most list endpoints. */
export interface PaginatedEnvelope {
  page?: number;
  page_size?: number;
  total_pages?: number;
  total_items?: number;
  /** Price-book endpoints use these two names instead. */
  total_pages_count?: number;
  total_count?: number;
  [key: string]: unknown;
}

/** The shape every list action in this app returns, whichever envelope came back. */
export interface NormalizedList<T = unknown> {
  items: T[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalItems?: number;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `notify=false` and `arrival_window_in_minutes=0` are
 * both meaningful, and dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect` or comma-typed param into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host passes a `json` param through in whichever shape it arrived, so both
 * are handled once here rather than at every call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a 422 body can list every field on the form. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Housecall Pro ids are UUIDs or short opaque strings, so nothing legal is lost
 * by escaping — while a `/` or `?` pasted into an id field would otherwise
 * rewrite the request path.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Build the query string, sending arrays as repeated `name[]=value`.
 *
 * See the module note above for why the bracketed form and not the OAS default.
 * An empty array is dropped rather than sent as `name[]=`, which Rails would
 * read as a one-element list containing the empty string.
 */
export function buildQuery(query: Record<string, QueryValue> = {}): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === undefined || entry === null || entry === "") continue;
        params.append(`${key}[]`, String(entry));
      }
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

/**
 * Fold any of the three envelopes into one `{items, page, …}` shape.
 *
 * `collectionKey` is the vendor's own plural key for the endpoint. `data` is
 * tried as a fallback because the price-book and job-line-item endpoints use it
 * instead, and a bare array is accepted because a future endpoint that answers
 * one should not read as empty.
 */
export function normalizeList<T = unknown>(
  body: unknown,
  collectionKey: string,
): NormalizedList<T> {
  if (Array.isArray(body)) return { items: body as T[] };
  if (!body || typeof body !== "object") return { items: [] };

  const envelope = body as PaginatedEnvelope;
  const raw = envelope[collectionKey] ?? envelope.data;
  const items = Array.isArray(raw) ? raw as T[] : [];

  return {
    items,
    page: envelope.page,
    pageSize: envelope.page_size,
    // The price-book endpoints spell these two `total_pages_count` and
    // `total_count`; the `??` is the whole compatibility layer.
    totalPages: envelope.total_pages ?? envelope.total_pages_count,
    totalItems: envelope.total_items ?? envelope.total_count,
  };
}

interface ErrorEnvelope {
  message?: string;
  error?: { message?: string } | string;
  errors?: Record<string, string[] | string>;
  [key: string]: unknown;
}

/**
 * Turn any of Housecall Pro's five error bodies into one actionable line.
 *
 * The credential never enters this module, so a message can only carry the
 * vendor's own prose and the caller's own input.
 */
export function formatHousecallError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ErrorEnvelope | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorEnvelope;
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = parsed ? extractMessage(parsed) : "";
  const head = `Housecall Pro ${status} for ${method} ${path}`;

  if (status === 401) {
    // Measured 2026-08-11: `{"message":"Unauthorized"}` is returned byte-for-byte
    // for a missing credential AND for a wrong one, so the body cannot tell them
    // apart and neither can this message. Say what to check instead of guessing.
    return `${head}: ${detail || "Unauthorized"}. Housecall Pro returns an identical body for a ` +
      "missing and for a rejected credential — reconnect this connection, and check the key has " +
      "not been revoked in Housecall Pro.";
  }
  if (status === 403) {
    return `${head}: ${detail || "Forbidden"}. This can mean the credential is not entitled to ` +
      "the location it asked for — see the X-Company-Id / location hierarchy rules.";
  }
  return truncate(detail ? `${head}: ${detail}` : `${head}: ${truncate(raw)}`, 1000);
}

/**
 * Pull the human-readable part out of whichever error shape arrived.
 *
 * Ordered most-specific first: a 422's per-field `errors` map is the most useful
 * thing in the body and would be lost if the flat `message` were read first.
 */
export function extractMessage(body: ErrorEnvelope): string {
  if (body.errors && typeof body.errors === "object") {
    const parts: string[] = [];
    for (const [field, value] of Object.entries(body.errors)) {
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      parts.push(`${field}: ${text}`);
    }
    if (parts.length) return parts.join("; ");
  }
  if (typeof body.error === "string" && body.error) return body.error;
  if (body.error && typeof body.error === "object" && body.error.message) {
    return String(body.error.message);
  }
  if (typeof body.message === "string" && body.message) {
    // The 400 shape carries per-attribute arrays beside the sentence; append
    // them, because "Validation failed" alone does not say which field.
    const attrs = Object.entries(body)
      .filter(([k, v]) => k !== "message" && Array.isArray(v))
      .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`);
    return attrs.length ? `${body.message} (${attrs.join("; ")})` : body.message;
  }
  return "";
}

export class HousecallClient {
  constructor(private ctx: HookContext) {}

  /** Parse and return the body. Every endpoint in this app answers JSON. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A list endpoint, folded into the one shape documented on {@link normalizeList}. */
  async list<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
  ): Promise<NormalizedList<T>> {
    return normalizeList<T>(await this.json(path, options), collectionKey);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    const query = buildQuery(options.query);
    if ([...query.keys()].length > 0) url.search = query.toString();

    const headers: Record<string, string> = { accept: "application/json" };
    // No `Authorization` here, ever: the runtime routes this request through the
    // Auth `sign` hook, which is the only code handed the credential.
    if (options.companyId) headers[COMPANY_ID_HEADER] = options.companyId;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatHousecallError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}

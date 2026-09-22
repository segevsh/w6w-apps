import type { HookContext, OutputField, Param } from "@w6w/types";

/**
 * Practice Better API v1 client — `https://api.practicebetter.io`.
 *
 * Everything in this file was read from the vendor's own OpenAPI 3.0 document,
 * `https://api-docs.practicebetter.io/swagger.json` (`info.title` "Practice
 * Better API Documentation", `info.version` "v1", 69 paths, ~650 KB), fetched
 * 2026-09-22. Nothing here came from a third-party integration directory or a
 * sibling app.
 *
 * ## One host
 *
 * The document declares exactly one server, `https://api.practicebetter.io`,
 * and no environment variants, so nothing about the origin is derived from the
 * credential. `api-docs.practicebetter.io` is the documentation host: no request
 * this app makes ever goes there, and it is deliberately absent from the
 * manifest's `network.allow`.
 *
 * ## Authentication is not done here
 *
 * This client never sets an `Authorization` header. Every request is routed
 * through the auth `sign` hook, which stamps `Authorization: Bearer
 * <accessToken>` with the token minted by the client-credentials grant. No
 * action ever sees the credential.
 *
 * ## Failures have NO documented body
 *
 * This is the single most important thing to know about this API. Every
 * operation's `400`/`401`/`403`/`404`/`409`/`429`/`500` response declares a
 * `description` and no `content`/schema at all. The only error-shaped schema in
 * the whole document is `ExternalApiError` (`externalErrorCode`, `message`,
 * `source`, `statusCode`) — and that describes an error from a THIRD-PARTY
 * system the practice's Practice Better account integrates with (Claim.MD,
 * Fullscript, …), **not** Practice Better's own refusal bodies.
 *
 * So {@link formatPracticeBetterError} parses the body *defensively*: it tries
 * JSON, looks for the handful of message keys a JSON body might use, falls back
 * to the raw text, and falls back again to the bare status. It never assumes a
 * fixed envelope, because there is none to assume. The status code is the
 * primary classifier everywhere in this app and the body is evidence *about*
 * that status, never a schema to key off.
 *
 * ## Pagination is one shape, repeated on every list endpoint
 *
 * Every list operation this app calls declares the same four query parameters —
 * `after_id`, `before_id` (string cursors), `limit` (int32, documented 1–100) and
 * `skip` (int32) — and answers the same envelope:
 *
 * ```json
 * { "count": 128, "hasMore": true, "items": [] }
 * ```
 *
 * {@link pageParams} declares the four inputs and {@link pageOutput} the three
 * output columns once, so the 13 list actions in this app cannot drift apart.
 * List actions return the envelope **verbatim** (as {@link Page}) rather than
 * unwrapping `items`, because `count` and `hasMore` are how a workflow decides
 * whether to keep paging.
 *
 * Array-valued filters (`status`, `type`, `consultants`, `records`, …) are
 * declared in the document as array query parameters with no `style`/`explode`
 * override, so the OpenAPI 3 default applies and the key is **repeated** on the
 * wire (`?status=active&status=archived`) rather than comma-joined.
 *
 * ## There are no rate-limit headers
 *
 * The whole document was checked for `ratelimit`/`rate-limit`/`retry-after`/
 * `x-rate`: zero hits. Headroom cannot be read at all, which is why
 * `health/quota.ts` declares that absence instead of probing for it.
 */

/** The one and only API origin. The document declares no other server. */
export const API_BASE = "https://api.practicebetter.io";

/** The OAuth2 client-credentials mint point (`components.securitySchemes.oauth2`). */
export const TOKEN_URL = `${API_BASE}/oauth2/token`;

/** What may be sent as a query-string value. Arrays are sent as repeated keys. */
export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  query?: Record<string, QueryValue>;
}

/** The four pagination controls, exactly as the document declares them. */
export interface PageInput {
  after_id?: string;
  before_id?: string;
  limit?: number;
  skip?: number;
}

/** The envelope every list operation answers with, returned verbatim. */
export interface Page<T> {
  count?: number;
  hasMore?: boolean;
  items: T[];
}

/**
 * The four pagination query parameters, declared once.
 *
 * `limit`'s range is the one thing here the vendor states numerically ("1–100");
 * it declares no default for any of the four, so none is prefilled — a page size
 * this app invented would be this app's number, not the API's.
 */
export const pageParams: Param[] = [
  {
    key: "after_id",
    label: "After ID",
    type: "string",
    hint:
      "Forward cursor: return records after this id. The document types it as an opaque string and " +
      "declares no other semantics — feed it the id of the last record you saw.",
  },
  {
    key: "before_id",
    label: "Before ID",
    type: "string",
    hint: "Backward cursor: return records before this id.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    validation: { integer: true, min: 1, max: 100 },
    hint:
      "Page size, 1–100 as the document declares. No default is documented, so nothing is assumed " +
      "here — send it when the page size matters.",
  },
  {
    key: "skip",
    label: "Skip",
    type: "number",
    validation: { integer: true },
    hint: "Number of records to skip within the result set.",
  },
];

/** The three output columns every list action declares. */
export const pageOutput: OutputField[] = [
  { key: "count", type: "number", label: "Total records matching the query" },
  { key: "hasMore", type: "boolean", label: "Another page is available" },
  { key: "items", type: "array", label: "Records on this page" },
];

/** The pagination slice of a list action's query, with unset controls dropped. */
export function pageQuery(input: PageInput): Record<string, QueryValue> {
  return compact({
    after_id: input.after_id,
    before_id: input.before_id,
    limit: input.limit,
    skip: input.skip,
  });
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `expired: false` and `skip: 0` are both meaningful,
 * and silently dropping them would make them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v as QueryValue;
  }
  return out;
}

/** Same as {@link compact}, for the `Record<string, QueryValue>` query shape. */
export function compactQuery(
  obj: Record<string, QueryValue>,
): Record<string, QueryValue> {
  return compact(obj);
}

/**
 * Normalise a list-valued filter into an array of strings.
 *
 * The array-shaped parameters (`status`, `paymentstatus`, `type`, `consultants`,
 * `records`, `services`, `packages`, `eventTypes`) are declared by the vendor as
 * arrays of `{name, value}` enum objects or of ids. The document does not publish
 * the enum values, so the caller supplies the **names** it wants as free text
 * (`ClientRecordStatus`, `PackageInstanceStatus`, `InvoicePaymentStatus` and
 * `ReminderType` are all `{name, value}` pairs in the schema) rather than picking
 * from a list this app would have had to invent.
 *
 * Accepts what the host hands a `multiselect` (an array) and what a human types
 * into a single field (comma-separated), and returns `undefined` for "no filter"
 * — an empty list is not the same thing as an absent one.
 */
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
 * The nested vendor types this app passes through — `Money`, `OfficeLocation`,
 * `telehealthSettings`, `notificationOptions`, `ClientRecordProfile`,
 * `services`, `courses` — are real sub-objects with their own fields, but the
 * document's field lists for them are long and this app's job is to *call* the
 * endpoint with them, not to mirror them. So they are free-form JSON, and the
 * host can hand that through either parsed or as text.
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

/** Same as {@link asOptionalJson}, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Ids in this API are opaque strings, and `encodeURIComponent` neutralises a `/`
 * or `?` someone pastes into an id field while leaving the characters real ids
 * use untouched.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * What a non-2xx body can be read as, given that the document declares no shape
 * for one.
 *
 * `detail` is what goes in the thrown message. `code` is only set when the body
 * happens to carry a string under a key that reads as a machine code — it is
 * deliberately best-effort, because there is no envelope to key off.
 */
export interface ErrorDetail {
  detail: string;
  code?: string;
}

/** Keys a JSON error body might plausibly use, most specific first. */
const MESSAGE_KEYS = ["message", "error_description", "detail", "error", "title"];
const CODE_KEYS = ["code", "externalErrorCode", "statusCode"];

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Read what is readable out of a failure body.
 *
 * The document publishes **no** error envelope for this API's own 4xx/5xx
 * responses, so this is a best-effort read and says so: JSON is attempted (a
 * nested `error` object's `message` is looked at too), the raw text is the
 * fallback, and an empty body yields an empty detail rather than a fabricated
 * one. The one schema-shaped case that *is* documented — `ExternalApiError`'s
 * `externalErrorCode` — is read if present, because when a third-party
 * integration fails Practice Better may relay it, but nothing depends on it.
 */
export function readErrorBody(text: string): ErrorDetail {
  const raw = text.trim();
  if (!raw) return { detail: "" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { detail: raw.slice(0, 300) };
  }
  if (parsed === null || typeof parsed !== "object") return { detail: raw.slice(0, 300) };

  const body = parsed as Record<string, unknown>;
  const nested = body.error && typeof body.error === "object"
    ? body.error as Record<string, unknown>
    : undefined;

  let detail: string | undefined;
  for (const key of MESSAGE_KEYS) {
    detail = asNonEmptyString(body[key]) ?? (nested ? asNonEmptyString(nested[key]) : undefined);
    if (detail) break;
  }

  let code: string | undefined;
  for (const key of CODE_KEYS) {
    code = asNonEmptyString(body[key]) ?? (nested ? asNonEmptyString(nested[key]) : undefined);
    if (code) break;
  }

  return { detail: (detail ?? raw).slice(0, 300), code };
}

/**
 * Turn a non-2xx response into something actionable.
 *
 * The status is named first because it is the only part of a failure this API
 * actually documents; the body is appended as evidence when it says anything.
 * `409` and `429` get an explicit recommendation because both are recoverable
 * and both are documented statuses on several operations in this app.
 */
export function formatPracticeBetterError(
  status: number,
  method: string,
  path: string,
  text: string,
): string {
  const { detail, code } = readErrorBody(text);
  const parts = [
    `Practice Better returned HTTP ${status} for ${method} ${path}`,
    code ? `code ${code}` : undefined,
    detail || undefined,
    status === 409
      ? "a conflict — for a create this usually means the resource already exists"
      : undefined,
    status === 429
      ? "rate limited — the document publishes no rate-limit header, so back off and retry"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class PracticeBetterClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body, or `undefined` for a no-content success (some deletes answer 204). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, url } = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Practice Better did not return JSON for ${url.pathname}: ${text.slice(0, 160)}`,
      );
    }
  }

  /**
   * Parse a list envelope.
   *
   * Returning the envelope rather than `items` is deliberate: `count` and
   * `hasMore` are the caller's paging signal, and inventing a flattened shape
   * would lose them.
   */
  list<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    return this.request<Page<T>>(path, options);
  }

  /** Status only, for the deletes that answer 200/202/204 with no usable body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = (await this.send(path, options)).res;
    return res.status;
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; url: URL }> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      if (Array.isArray(v)) {
        // OpenAPI 3's default for an array query parameter is `style: form,
        // explode: true`, and the document declares no override — so the key is
        // repeated rather than comma-joined.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const method = init.method ?? "GET";

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(formatPracticeBetterError(res.status, method, url.pathname, text));
    }
    return { res, url };
  }
}

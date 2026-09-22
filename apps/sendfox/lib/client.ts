import type { HookContext } from "@w6w/types";

/**
 * SendFox REST client.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against SendFox's own OpenAPI document
 * (`https://sendfox.com/openapi.yaml`, fetched live that day: HTTP 200,
 * `text/yaml`, 92,206 bytes, `info.title` "SendFox API", `info.version` 1.4.0),
 * plus live unauthenticated probes of `api.sendfox.com`. Nothing came from a
 * third-party integration directory.
 *
 * ## One host, no version prefix
 *
 * The document declares exactly one server, `https://api.sendfox.com`, and its
 * paths carry no version segment — `/contacts`, `/campaigns`, `/me`. The
 * marketing host (`sendfox.com`) is never called at runtime; it serves the docs
 * and the OAuth dance this app deliberately does not implement.
 *
 * ## Two response envelopes, not one
 *
 * Collections answer a Laravel paginator — `{data, current_page, total,
 * per_page}` — but a single-resource read answers the **bare entity**:
 * `GET /contacts/{id}` is a `Contact`, `GET /me` is a `User`, and both `POST
 * /contacts` and `PATCH /contacts/{id}` return a `Contact`. So {@link
 * SendfoxClient.json} never unwraps anything; each action reads the shape its
 * own endpoint documents. A client that unconditionally unwrapped `data` would
 * return `undefined` for `/me`.
 *
 * `GET /contacts` is the one endpoint with a third shape: with `count_only=true`
 * it answers `{count, filter}` instead of a page.
 *
 * ## Errors
 *
 * Laravel's default error format, per the spec's own description:
 * `{"message": "...", "errors": {...}}`, where `errors` is field-level and
 * appears only on 422. The 403 case is different again — an account restricted
 * by SendFox gets a structured `{"error", "code": "account_restricted",
 * "account_status_url"}` body instead.
 *
 * ## Rate limits
 *
 * 60 requests/minute per authenticated user. Every authenticated response
 * carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`; a 429 adds
 * `Retry-After`. See `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.sendfox.com";

/** A query value: scalars are sent once, arrays as a repeated key. */
export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** SendFox's Laravel paginator, the shape of every collection endpoint. */
export interface SendfoxPage<T> {
  data?: T[];
  current_page?: number;
  total?: number;
  per_page?: number;
}

/**
 * The shape `GET /contacts?count_only=true` answers instead of a page.
 *
 * `filter` is a human-readable rendering of the filter that was applied, not a
 * value to round-trip.
 */
export interface SendfoxCount {
  count?: number;
  filter?: string;
}

interface SendfoxErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  /** Present only on the structured `account_restricted` 403. */
  error?: string;
  code?: string;
  account_status_url?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `gdpr_required: false` and a `link_limit` of 0 (not
 * that the API allows it) are meaningful, and silently dropping them would make
 * them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a boolean the way sendfox.com reads one.
 *
 * The document types these as plain booleans; Laravel's `boolean()` helper
 * accepts `1`, `true`, `on`, `yes` (and their negatives). `true`/`false` is the
 * least surprising spelling on the wire, and a false is sent rather than
 * dropped: `unsubscribed=false` is a real filter ("only contacts who have not
 * unsubscribed"), not the same request as omitting it.
 */
export function bool(v: boolean | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  return v ? "true" : "false";
}

/**
 * Accept an id list as either an array or the comma-separated string a user
 * typed, dropping anything that is not a positive integer.
 */
export function toIdList(v: unknown): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const raw = Array.isArray(v) ? v : String(v).split(",");
  const ids = raw
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : undefined;
}

/**
 * Path-escape a caller-supplied resource id.
 *
 * SendFox addresses everything by integer id, so this mostly guards against a
 * pasted `/` or `?` escaping the path segment. `encodeURIComponent` leaves `~`
 * alone and neutralises the rest.
 */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a Laravel validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Parse a `account_restricted` 403 body, if that is what this is.
 *
 * Kept separate from the generic formatter because it is a *different* failure:
 * the credential is fine and the account is restricted, and the body carries the
 * URL of the page that explains it. Folding it into "403 Forbidden" would throw
 * that link away.
 */
export function parseAccountRestricted(raw: string): SendfoxErrorBody | undefined {
  try {
    const parsed = JSON.parse(raw) as SendfoxErrorBody;
    return parsed?.code === "account_restricted" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Turn a SendFox error body into one actionable line.
 *
 * The Laravel `message` is surfaced verbatim; a 422's field-level `errors` are
 * appended because "The given data was invalid." on its own tells the caller
 * nothing about *which* field. A 429 carries the backoff advice the vendor
 * documents.
 *
 * The message can carry only SendFox's own prose and the caller's own input; the
 * credential never enters this module.
 */
export function formatSendfoxError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const restricted = parseAccountRestricted(raw);
  if (restricted) {
    const parts = [
      `SendFox ${status} account_restricted for ${method} ${path}`,
      restricted.error ?? restricted.message,
      restricted.account_status_url
        ? `account status: ${restricted.account_status_url}`
        : undefined,
    ].filter(Boolean);
    return truncate(parts.join(": "), 1000);
  }

  let parsed: SendfoxErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SendfoxErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || typeof parsed !== "object") {
    return `SendFox ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fieldErrors = parsed.errors
    ? Object.entries(parsed.errors)
      .map(([field, messages]) => `${field}: ${(messages ?? []).join(", ")}`)
      .join("; ")
    : undefined;

  const parts = [
    `SendFox ${status} for ${method} ${path}`,
    parsed.message,
    fieldErrors ? `validation: ${fieldErrors}` : undefined,
    status === 429
      ? "SendFox allows 60 requests/minute per authenticated user; wait for the Retry-After window"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class SendfoxClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body. `undefined` for a 204 or an empty body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * The raw response, for a caller that needs its headers rather than its body.
   *
   * `health/quota.ts` is the one such caller: it reads `X-RateLimit-*` off an
   * ordinary authenticated read.
   */
  request(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.send(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      // SendFox documents its list/tag id filters as OpenAPI arrays in the
      // default `style: form, explode: true` form, and write a repeated key
      // with a literal `[]` suffix only when they mean one (the undocumented
      // `campaign_ids[]` batch param). So an array becomes a repeated key
      // here — `filter[in_list_ids]=1&filter[in_list_ids]=2` — and never a
      // comma-joined value, which Laravel would read as one bad id.
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSendfoxError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

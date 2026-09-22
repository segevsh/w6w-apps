import type { HookContext } from "@w6w/types";

/**
 * Cloudbeds PMS API v1.3 client — `https://api.cloudbeds.com/api/v1.3/{method}`.
 *
 * Everything in this file was verified on 2026-09-22 against the OpenAPI 3.0.1
 * document Cloudbeds embeds in every one of its reference pages
 * (`developers.cloudbeds.com/reference/<slug>.md`) plus live probes against
 * `api.cloudbeds.com`. The embedded document declares exactly one server,
 * `https://api.cloudbeds.com/api/v1.3/`, and states the wire format in prose:
 * "Request Format: HTTP GET, POST and PUT (Content-Type:
 * application/x-www-form-urlencoded)".
 *
 * The intake brief guessed `https://api.cloudbeds.com/{method}` with no
 * `/api/v1.3/` segment. That is wrong, and wrong in the quiet way: a live call
 * to the guessed path answers **404 with an HTML marketing page**
 * ("Cloudbeds.com — Soluções online para hotéis e pousadas"), not a JSON
 * refusal. The real base answers `401 {"error":"access_denied", "hint":"Missing
 * \"Authorization\" header"}`. Do not "simplify" the constant below back to the
 * guessed shape.
 *
 * ## One host, one prefix, two verbs that write
 *
 * Reads are GET with query parameters. Writes are POST/PUT with a
 * form-encoded body (`application/x-www-form-urlencoded`), per every
 * operation's `requestBody.content` key. Nothing here sends JSON to Cloudbeds:
 * a JSON body is silently ignored by the vendor rather than rejected, so this
 * client never produces one.
 *
 * ## HTTP 200 is NOT success — the quirk this file exists to encode
 *
 * Cloudbeds documents (in "Common API errors & How to handle") that some
 * failures answer **HTTP 200 with `{"success": false, "message": "…"}`**:
 *
 * ```json
 * { "success": false, "message": "User who approved this connection is not active anymore" }
 * ```
 *
 * with siblings for a property whose status is no longer active and for a
 * requested property the token does not cover. So `res.ok` is not a
 * success test here. {@link CloudbedsClient.request} parses every 2xx body and
 * treats a literal `success === false` as a failure — with the vendor's own
 * `message` in the thrown text, because "HTTP 200" tells the operator nothing
 * about which of the three documented causes they hit. The check is
 * deliberately `=== false`: `GetMetadataResponse` types its own `success` as a
 * *string*, so a truthiness test would misfire on it.
 *
 * ## Error shape when the status is honest
 *
 * 4xx/5xx bodies are `{"error": "<code>", "error_description"?: "…",
 * "message"?: "…", "hint"?: "…"}`. Both live 401s were observed on 2026-09-22
 * and they carry the *same* status with different fixes:
 *
 *   - no credential — `{"error":"access_denied","error_description":"The
 *     resource owner or authorization server denied the request.","hint":
 *     "Missing \"Authorization\" header"}`
 *   - a bad credential — `{"error":"access_denied","hint":"Access token is
 *     invalid"}` (no `error_description` at all)
 *
 * {@link formatCloudbedsError} therefore surfaces `error` and `hint` (falling
 * back to `error_description`/`message`) instead of flattening both to "401".
 *
 * ## Authentication is not done here
 *
 * This client never touches a credential. The auth `sign` hook stamps
 * `Authorization: Bearer <accessToken>` — the header shape both the OAuth 2.0
 * guide and the API-keys guide state verbatim.
 *
 * ## Rate limits
 *
 * Every endpoint is documented at **10 requests/second**. No live *API*
 * response carries a rate-limit header of any kind (verified on the 401s
 * above), there is no headroom endpoint in the reference navigation, and a 429
 * carries a `Retry-After` only once you have already hit the limit. See
 * `health/quota.ts` for why that is declared as an absence rather than probed.
 */

/** The single declared server, prefix included. */
export const API_BASE = "https://api.cloudbeds.com/api/v1.3";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** A body field: a scalar, or a list of records sent in PHP bracket notation. */
export type FormValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<Record<string, unknown>>;

export interface RequestOptions {
  /** Defaults to `GET`. Cloudbeds uses `POST`/`PUT` for its write operations. */
  method?: string;
  query?: Record<string, QueryValue>;
  /**
   * Form-encoded body. Serialized by {@link encodeForm}, never as JSON — see
   * the file header.
   */
  body?: Record<string, FormValue>;
  /**
   * Extra headers, merged in after `accept`/`content-type`.
   *
   * Every Action relies on `ctx.fetch` already being signed by the host, so
   * this is never used there. It exists for `auth/oauth2.ts`'s `test` and
   * `afterConnect` hooks, which run against a credential that is *not yet* an
   * established Connection — `sign` is "the only hook that reads the
   * credential" per the platform's own contract, so those two hooks must
   * stamp `Authorization: Bearer <token>` themselves, the same way
   * `apps/asana/auth/oauth2.ts` and `apps/apify/auth/api-token.ts` do.
   */
  headers?: Record<string, string>;
}

/** The `{success, data, …}` envelope most operations answer. */
export interface CloudbedsEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  count?: number;
  total?: number;
  message?: string;
}

/** The documented 4xx/5xx error envelope, as far as this formatter reads it. */
export interface CloudbedsErrorBody {
  error?: string;
  error_description?: string;
  message?: string;
  hint?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `detailedRates=false` and `pageNumber=0` are both
 * meaningful, and silently dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Serialize a body the way Cloudbeds' PHP backend parses it.
 *
 * Scalars go in as-is. A list of records becomes PHP's bracket notation
 * (`rooms[0][roomTypeID]=…&rooms[0][quantity]=1`), which is the only encoding
 * a PHP model binder reads back as an array of objects — and Cloudbeds is
 * unmistakably PHP (a live token exchange refuses an unknown client with
 * `Entity not found: CloudBeds\MyFrontDesk\API\Models\Client`). The vendor's
 * own reference documents these fields as `array of object` under
 * `application/x-www-form-urlencoded` and never shows a serialized example, so
 * this is the pack's bracket-notation convention (see `apps/stripe`,
 * `apps/jotform`, `apps/gravityforms`) applied to a backend that reads it
 * natively. There is no JSON fallback: a JSON body is ignored, not rejected.
 */
export function encodeForm(body: Record<string, FormValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        for (const [sub, subValue] of Object.entries(item ?? {})) {
          if (subValue === undefined || subValue === null || subValue === "") continue;
          params.append(`${key}[${index}][${sub}]`, scalar(subValue));
        }
      });
      continue;
    }
    params.append(key, scalar(value));
  }
  return params.toString();
}

/** Booleans as the vendor's own `true`/`false`, everything else as given. */
function scalar(value: unknown): string {
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Read the code, hint and description out of Cloudbeds' error envelope. */
export function readCloudbedsError(text: string): CloudbedsErrorBody {
  const raw = text.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const body = parsed as CloudbedsErrorBody;
      return {
        error: typeof body.error === "string" ? body.error : undefined,
        error_description: typeof body.error_description === "string"
          ? body.error_description
          : undefined,
        message: typeof body.message === "string" ? body.message : undefined,
        hint: typeof body.hint === "string" ? body.hint : undefined,
      };
    }
  } catch {
    // Not JSON — the formatter keeps the body as served.
  }
  return {};
}

/**
 * Turn a non-2xx body into something actionable.
 *
 * `hint` is the field Cloudbeds writes for the operator ("Missing
 * \"Authorization\" header", "Access token is invalid") and it leads; the
 * generic `error_description` follows in parentheses because both live 401s
 * carry the same one and it is not what distinguishes them.
 *
 * A body that is not the documented envelope (an edge proxy's HTML, say) is
 * kept verbatim so nothing is silently swallowed.
 */
export function formatCloudbedsError(
  status: number,
  method: string,
  path: string,
  text: string,
): string {
  const { error, error_description, message, hint } = readCloudbedsError(text);
  const parts = [`Cloudbeds ${status}${error ? ` ${error}` : ""} for ${method} ${path}`];
  const detail = hint ?? error_description ?? message;
  if (detail) parts.push(detail);
  if (hint && error_description && hint !== error_description) {
    parts.push(`(${error_description})`);
  }
  if (!detail) {
    const raw = truncate(text.trim(), 300);
    if (raw) parts.push(raw);
  }
  if (status === 401) {
    parts.push(
      "the credential was refused — reconnect the app if the token has expired (access tokens last " +
        "8 hours and are refreshed automatically)",
    );
  }
  if (status === 404) {
    parts.push("check the method name and the ids in the request");
  }
  if (status === 429) {
    parts.push(
      "Cloudbeds rate-limits every endpoint at 10 requests/second; wait for the Retry-After header " +
        "and retry with exponential backoff",
    );
  }
  return truncate(parts.join(": "), 1000);
}

/**
 * The failure that arrives with an HTTP 200.
 *
 * Separate from {@link formatCloudbedsError} because there is no status to
 * report: the whole point is that the status lied. The vendor's three
 * documented causes are a deactivated approving user, a property whose status
 * is no longer valid, and a token that does not cover the requested property —
 * all of them fixed in the Cloudbeds portal or by reconnecting, never by
 * retrying.
 */
export function formatCloudbedsFailure(
  method: string,
  path: string,
  message: string | undefined,
): string {
  const parts = [
    `Cloudbeds returned HTTP 200 with \`success: false\` for ${method} ${path}`,
    message ?? "no message was supplied",
  ];
  parts.push(
    "the request was refused despite the 200 — the usual causes are that the user who approved " +
      "this connection is no longer active, that the property is no longer active, or that the " +
      "token does not cover the requested property",
  );
  return truncate(parts.join(": "), 1000);
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Coerce a `json` param into the list of records the body encoder expects.
 *
 * `guestRequirements` is documented as `array of object` with **no** element
 * properties published, so it cannot be rendered as a typed form the way
 * `rooms`/`customFields` are. A caller supplies it as JSON and this keeps it
 * as a list of records (or refuses it early, rather than sending something the
 * vendor will ignore).
 */
export function asRecordList(
  value: unknown,
  label: string,
): Array<Record<string, unknown>> | undefined {
  const parsed = asOptionalJson<unknown>(value, label);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array of objects`);
  return parsed.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label}[${index}] must be an object`);
    }
    return item as Record<string, unknown>;
  });
}

/**
 * A Cloudbeds request/response pair.
 *
 * Two methods rather than one because the envelope's two halves are wanted by
 * different operations: {@link CloudbedsClient.request} for the lists (where
 * `count`/`total` are part of the answer) and {@link CloudbedsClient.data} for
 * the single-resource reads (where `data` is the whole answer).
 */
export class CloudbedsClient {
  constructor(private ctx: HookContext) {}

  /**
   * The whole response body, after the HTTP-200-`success:false` guard.
   *
   * List operations answer `{success, data: [...], count, total}` and are
   * returned **verbatim** by the actions that call this: `count`/`total` are
   * how a workflow decides whether to keep paging, and unwrapping to `data`
   * here would drop them.
   */
  async request<T = CloudbedsEnvelope>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, url, method } = await this.send(path, options);
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      throw new Error(
        `Cloudbeds did not return JSON for ${method} ${url.pathname}: ${truncate(text, 160)}`,
      );
    }
    if (
      body !== null && typeof body === "object" && !Array.isArray(body) &&
      (body as { success?: unknown }).success === false
    ) {
      throw new Error(
        formatCloudbedsFailure(
          method,
          url.pathname,
          (body as { message?: string }).message,
        ),
      );
    }
    return body as T;
  }

  /** The envelope's `data` member — the single-resource GETs, and a list's rows. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<CloudbedsEnvelope<T>>(path, options);
    return (body ?? {}).data as T;
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; url: URL; method: string }> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeForm(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(formatCloudbedsError(res.status, method, url.pathname, text));
    }
    return { res, url, method };
  }
}

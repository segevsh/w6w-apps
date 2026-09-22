import type { HookContext } from "@w6w/types";

/**
 * TeamUp API v2 client — `https://goteamup.com/api/v2`.
 *
 * Everything in this file follows from five facts about the vendor's API,
 * all of them taken from the operation data published in TeamUp's own API
 * reference (<https://docs.goteamup.com/api-reference>, read 2026-09-22).
 *
 * ## 1. One host, one prefix
 *
 * There is exactly one server (`https://goteamup.com`) and one path prefix
 * (`/api/v2`). `docs.goteamup.com` and `goteamup.github.io` are documentation
 * hosts — no request this app makes ever goes there.
 *
 * ## 2. Authentication is not done here
 *
 * This client never sets an `Authorization` header. Every request is routed
 * through the auth `sign` hook, which stamps `Authorization: Bearer <M2M
 * token>` — the header shape the hand-written Authentication guide states
 * verbatim, and the one an M2M token (TeamUp's API-key equivalent) is used
 * with. No action ever sees the credential.
 *
 * Two headers this app deliberately does **not** send by default:
 *
 *  - `TeamUp-Request-Mode` — an M2M token always operates in **Provider
 *    mode** under admin permissions, so the mode header is unnecessary.
 *  - `TeamUp-Provider-ID` — only needed to disambiguate a multi-location
 *    business. It is sent when, and only when, an action's `providerId` input
 *    is supplied; see {@link RequestOptions.providerId}.
 *
 * ## 3. Failures are one documented envelope
 *
 * Every non-2xx body is `{"code", "field_errors", "message", "type"}`:
 *
 * ```json
 * {
 *   "code": "parameter_invalid",
 *   "field_errors": { "field_name": ["message"], "non_field_errors": ["…"] },
 *   "message": "You request was invalid",
 *   "type": "invalid_request_error"
 * }
 * ```
 *
 * {@link formatTeamUpError} turns that into an Error whose text is the
 * vendor's own `message` plus its machine-readable `code`, so a caught error
 * reads as words rather than a JSON blob. Status meanings worth keeping in
 * mind: `401` is a bad or expired credential, `403` is a role/provider
 * mismatch that carries its own `code` (`permission_denied`,
 * `mode_not_allowed`, `provider_invalid`, …) and is surfaced rather than
 * special-cased, `404` is a missing resource, `429` is rate limiting.
 *
 * ## 4. Pagination is uniform and offset-based
 *
 * `page` (1-based, default 1) and `page_size` (default and maximum 100) are
 * accepted by every list operation, and every list answers the same envelope:
 *
 * ```json
 * { "count": 125, "next": "https://goteamup.com/api/v2/events?page=3",
 *   "previous": null, "results": [] }
 * ```
 *
 * List actions return that envelope **verbatim** (see {@link Page}) — they do
 * not unwrap `results`, because `count` is how a workflow decides whether to
 * keep paging.
 *
 * ## 5. 429 means back off
 *
 * TeamUp publishes no rate-limit headers, so headroom cannot be read in
 * advance and the only signal is the refusal itself. A caller that sees a
 * `429` from this client should retry with **exponential backoff** (and
 * jitter) rather than immediately; nothing in this client retries on its own,
 * because a host owns a workflow step's retry policy.
 */
import type { Page } from "./outputs.ts";

/** The single documented server. */
export const API_BASE = "https://goteamup.com";

/** Every operation this app calls carries this prefix. */
export const API_PREFIX = "/api/v2";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /**
   * Sent as the `TeamUp-Provider-ID` header when supplied.
   *
   * TeamUp's operations all document this optional header for multi-location
   * businesses; it is unset unless a caller names a provider (see
   * `providers-list`, which is how the valid ids are discovered).
   */
  providerId?: number | string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `comped: false` and `family: 0` are both
 * meaningful, and silently dropping them would make them impossible to
 * express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Same as {@link compact}, for query objects. */
export function compactQuery(
  obj: Record<string, QueryValue>,
): Record<string, QueryValue> {
  return compact(obj) as Record<string, QueryValue>;
}

/**
 * Parse a comma-separated form field into an array of integers.
 *
 * TeamUp's request bodies take real JSON arrays for a few fields
 * (`createEvent`'s `instructors` is the one this app sends), while a w6w form
 * field is a single string. `undefined` stays `undefined` — an empty list is
 * not the same as an absent field.
 */
export function intList(v: unknown): number[] | undefined {
  if (Array.isArray(v)) {
    return v.map((raw) => asInteger(raw));
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean).map((raw) => asInteger(raw));
}

function asInteger(raw: unknown): number {
  const n = Number(String(raw).trim());
  if (!Number.isInteger(n)) throw new Error(`\`${raw}\` is not an integer`);
  return n;
}

/**
 * Accept a `json` param as the value the caller supplied.
 *
 * TeamUp documents a handful of body fields as arrays/objects without
 * publishing their element shape (a customer's `field_values`, an event's
 * `registration_timelines`). The host hands a `json` param through in
 * whichever shape it arrived, so both a parsed value and the raw string are
 * handled here rather than at each call site.
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

/** The documented failure envelope, as far as this formatter reads it. */
export interface TeamUpErrorBody {
  code?: string;
  field_errors?: Record<string, string[]>;
  message?: string;
  type?: string;
}

/**
 * Turn TeamUp's documented error envelope into something actionable.
 *
 * The thrown text is the vendor's own `message` — the sentence TeamUp wrote
 * for a human — followed by its `code` and `type`, which are the
 * machine-readable halves a workflow can branch on. A body that is not the
 * documented shape (an HTML error page from an edge, say) is kept verbatim so
 * nothing is silently swallowed.
 *
 * `field_errors` is only consulted when the envelope carries no `message`: a
 * validation failure such as `{"code":"parameter_invalid","message":"You
 * request was invalid"}` ("You" is the vendor's own typo) is useless on its
 * own, and a `non_field_errors` entry is often the actual complaint.
 */
export function formatTeamUpError(
  status: number,
  method: string,
  path: string,
  text: string,
): string {
  let detail = text.trim();
  let code: string | undefined;
  let type: string | undefined;

  if (detail) {
    try {
      const parsed = JSON.parse(detail) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        const body = parsed as TeamUpErrorBody;
        detail = body.message ?? firstFieldError(body.field_errors) ?? detail;
        code = typeof body.code === "string" ? body.code : undefined;
        type = typeof body.type === "string" ? body.type : undefined;
      }
    } catch {
      // Not JSON — keep the body as served.
    }
  }

  const parts = [`TeamUp ${status} for ${method} ${path}`];
  if (detail) parts.push(detail.slice(0, 600));
  const envelope = [code ? `code ${code}` : "", type ? `type ${type}` : ""]
    .filter(Boolean)
    .join(", ");
  if (envelope) parts.push(`(${envelope})`);

  if (status === 401) {
    parts.push(
      "the M2M token was rejected — check it was copied exactly, has not been deleted, and " +
        "belongs to the business you meant",
    );
  }
  if (status === 403) {
    parts.push(
      "TeamUp refused this token for this operation — a role or provider-scope mismatch rather " +
        "than an expired credential",
    );
  }
  if (status === 429) {
    parts.push("rate limited — retry with exponential backoff");
  }
  return parts.join(": ");
}

/** What a caller can learn from a non-2xx body: the vendor's sentence and its code. */
export interface TeamUpErrorDetail {
  detail: string;
  code?: string;
}

/**
 * Read the code and message out of TeamUp's documented error envelope.
 *
 * The envelope is parsed here as JSON *only* for reporting: a body that is not
 * JSON (an edge proxy's HTML, say) leaves `code` unset and the raw text
 * becomes the detail, so nothing is silently discarded.
 */
export function readTeamUpError(text: string): TeamUpErrorDetail {
  const raw = text.trim();
  if (!raw) return { detail: "" };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const body = parsed as TeamUpErrorBody;
      const message = typeof body.message === "string" ? body.message : "";
      const code = typeof body.code === "string" ? body.code : undefined;
      // `message` is the vendor's own sentence; `field_errors` and the raw body
      // are the fallbacks, since "You request was invalid" alone says little.
      const detail = message || firstFieldError(body.field_errors) || raw;
      return { detail: detail.slice(0, 300), code };
    }
  } catch {
    // Not JSON — keep the body as served.
  }
  return { detail: raw.slice(0, 300) };
}

function firstFieldError(fieldErrors: Record<string, string[]> | undefined): string | undefined {
  if (!fieldErrors || typeof fieldErrors !== "object") return undefined;
  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") return messages[0];
  }
  return undefined;
}

export class TeamUpClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, url } = await this.send(path, options);
    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `TeamUp did not return JSON for ${url.pathname}: ${text.slice(0, 160)}`,
      );
    }
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; url: URL; method: string }> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.providerId !== undefined && options.providerId !== null) {
      headers["TeamUp-Provider-ID"] = String(options.providerId);
    }
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const method = init.method ?? "GET";

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(formatTeamUpError(res.status, method, url.pathname, text));
    }
    return { res, url, method };
  }
}

/** Re-exported so actions can type a list result without a second import. */
export type { Page };

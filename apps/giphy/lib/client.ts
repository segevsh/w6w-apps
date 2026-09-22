import type { HookContext } from "@w6w/types";

/**
 * GIPHY API client — `https://api.giphy.com/v1/...`.
 *
 * Verified on 2026-09-22 against GIPHY's own developer documentation
 * (`developers.giphy.com/docs/api/`, `/endpoint/` and `/schema/`) plus live
 * probes against `api.giphy.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, one prefix — and every call is a GET
 *
 * GIPHY documents a single host, `https://api.giphy.com`, and this app only
 * touches `/v1`. (`/v2/emoji*` is a separate API version with a different
 * object shape and is deliberately out of scope — see the README.) Every
 * endpoint in this app's surface is a `GET`; GIPHY's documented *write*
 * endpoint is an upload that needs a different, non-`api_key` authenticated
 * flow for GIPHY-channel accounts, so it is out of scope too.
 *
 * ## The status is in the BODY, not the status line
 *
 * GIPHY's envelope is `{ data, meta, pagination? }`, where `meta` is
 * `{ status, msg, response_id }` and `meta.status` is GIPHY's *own* copy of
 * the response code. The vendor's error table (200 OK, 400 Bad Request,
 * 401 Unauthorized, 403 Forbidden, 404 Not Found, 414 URI Too Long, 429 Too
 * Many Requests) is stated as those statuses appearing in `meta.status`.
 *
 * A live probe of a deliberately bad key answered HTTP 401 with the body
 * `{"data": [], "meta": {"status": 401, "msg": "Unauthorized",
 * "response_id": ""}}` — the two agree here, but the body is the field the
 * vendor documents as authoritative, and it is what {@link metaStatusOf}
 * reads. A success is `meta.status === 200`.
 *
 * ## Failures throw; one 404 does not
 *
 * {@link GiphyClient.envelope} throws a {@link GiphyApiError} whenever
 * `meta.status` is anything but 200, so a bad key or a rate limit surfaces as
 * a failed workflow step instead of a silent empty list. The single documented
 * exception is `GET /v1/gifs/{gif_id}`: an unknown id answers a `4xx`
 * `meta.status` with an empty `data`, which is a legitimate answer to "does
 * this id exist?" — so that one action passes `acceptMetaStatuses` and returns
 * the envelope instead.
 *
 * Error messages name the HTTP method and the **path only**. A GIPHY request
 * carries the credential in its query string, so quoting the URL would copy the
 * key into an error record; the path never does.
 */

/** The one and only API origin. GIPHY documents no other server. */
export const API_BASE = "https://api.giphy.com";

/** Every endpoint in this app's surface is under `/v1`. */
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

/** GIPHY's `meta` object: the vendor's own status, message and response id. */
export interface GiphyMeta {
  status?: number;
  msg?: string;
  response_id?: string;
}

/**
 * GIPHY's response envelope, on every endpoint.
 *
 * `data` is an array on the list endpoints and a single object on the
 * `random`/`translate` endpoints — GIPHY's own documented asymmetry, not an
 * accident to paper over. `pagination` is passed through verbatim: this app
 * declares no fields inside it, because the documentation page it was verified
 * against did not enumerate them.
 */
export interface GiphyEnvelope<T = unknown> {
  data?: T;
  meta?: GiphyMeta;
  pagination?: unknown;
}

export interface GiphyRequestOptions {
  query?: Record<string, QueryValue>;
  /**
   * `meta.status` values that are a legitimate answer rather than a failure.
   * Used by exactly one action — see the module comment.
   */
  acceptMetaStatuses?: number[];
}

/** Drop query keys the caller left unset, keeping `false` and `0` meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied GIF id.
 *
 * `encodeURIComponent` leaves the characters GIPHY ids actually use (letters,
 * digits, `-`, `_`) alone while neutralising a `/` or `?` pasted into the
 * field, which would otherwise let the id redefine the request path.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * The response code GIPHY states, preferring the body's `meta.status`.
 *
 * The HTTP status is only a fallback for a response that carries no readable
 * `meta` at all, so this never silently reports transport-level success where
 * the vendor stated a failure.
 */
export function metaStatusOf(body: unknown, httpStatus: number): number {
  const status = (body as GiphyEnvelope | null | undefined)?.meta?.status;
  return typeof status === "number" ? status : httpStatus;
}

/** GIPHY's documented code → the action a reader can take. */
export function remediation(status: number): string | undefined {
  switch (status) {
    case 400:
      return "a required parameter is missing or malformed";
    case 401:
      return "the API key is missing or not valid — reconnect the GIPHY connection";
    case 403:
      return "this key is not authorized for the request";
    case 404:
      return "the requested id does not exist";
    case 414:
      return "the search query is longer than GIPHY's 50-character limit";
    case 429:
      return "GIPHY rate-limited this key — every key starts as a beta key capped at 100 calls/hour";
    default:
      return undefined;
  }
}

/** An error carrying GIPHY's own status, message and response id. */
export class GiphyApiError extends Error {
  constructor(
    readonly metaStatus: number,
    readonly giphyMessage: string,
    readonly method: string,
    readonly pathname: string,
    readonly responseId?: string,
  ) {
    super(formatGiphyError(metaStatus, giphyMessage, method, pathname, responseId));
    this.name = "GiphyApiError";
  }
}

export function formatGiphyError(
  status: number,
  msg: string,
  method: string,
  pathname: string,
  responseId?: string,
): string {
  const parts = [
    `GIPHY ${status}${msg ? ` ${msg}` : ""} for ${method} ${pathname}`,
    remediation(status),
    responseId ? `response_id ${responseId}` : undefined,
  ].filter(Boolean);
  return parts.join(" — ");
}

export class GiphyClient {
  constructor(private ctx: HookContext) {}

  /**
   * The parsed envelope, with `meta.status` checked.
   *
   * @throws {GiphyApiError} when GIPHY's own status is not 200 and the status is
   * not listed in `acceptMetaStatuses`.
   */
  async envelope<T = unknown>(
    path: string,
    options: GiphyRequestOptions = {},
  ): Promise<GiphyEnvelope<T>> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const method = "GET";
    const res = await this.ctx.fetch(url.toString(), {
      method,
      headers: { accept: "application/json" },
    });
    const text = await res.text();

    let body: GiphyEnvelope<T> | null = null;
    if (text) {
      try {
        body = JSON.parse(text) as GiphyEnvelope<T>;
      } catch {
        throw new Error(
          `GIPHY returned a non-JSON body for ${method} ${url.pathname} (HTTP ${res.status})`,
        );
      }
    }

    const status = metaStatusOf(body, res.status);
    if (status !== 200 && !(options.acceptMetaStatuses ?? []).includes(status)) {
      throw new GiphyApiError(
        status,
        body?.meta?.msg ?? "",
        method,
        url.pathname,
        body?.meta?.response_id,
      );
    }
    return body ?? {};
  }

  /** Just `data`: the shape every action except `get-gif-by-id` returns. */
  async data<T = unknown>(path: string, options: GiphyRequestOptions = {}): Promise<T> {
    const body = await this.envelope<T>(path, options);
    return body.data as T;
  }
}

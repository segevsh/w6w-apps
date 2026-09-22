import type { HookContext } from "@w6w/types";

/**
 * Streamtime Public API v2 client.
 *
 * Every path, verb, query parameter and body field in this app was read out of
 * Streamtime's own OpenAPI 3.1 document, fetched live from
 * `https://api.streamtime.net/swagger.json` on 2026-09-22 (200,
 * `application/json`, 348,536 bytes, `info.title` "Public API", `info.version`
 * "1.0.0", 58 paths), and cross-checked against unauthenticated probes of
 * `api.streamtime.net` on the same day.
 *
 * ## One host, one prefix
 *
 * `servers[0].url` is `https://api.streamtime.net/v2` and it is the only server
 * the document declares. There is no regional or sandbox host, so nothing about
 * the origin is derived from the credential.
 *
 * ## There is no error envelope — and no way to tell "unknown path" from "bad token"
 *
 * Streamtime answers **every** unauthorised request with `401` and a body that
 * is literally the plain string `You are not authorised to make this request`
 * (43 bytes, `content-type: text/html; charset=UTF-8`, no JSON wrapper). Three
 * separate probes on 2026-09-22 returned that exact body, byte-for-byte
 * identical:
 *
 *   - `GET /v2/organisation` with no `Authorization` header;
 *   - the same request with a syntactically plausible but invalid bearer token;
 *   - `GET /v2/definitely-not-a-path` — a path that does not exist at all.
 *
 * So the credential gate runs **before** routing: a typo'd path and a dead token
 * are indistinguishable without a working credential. That is why
 * {@link isNotAuthorised} classifies from the body, and why the auth probe in
 * `auth/api-token.ts` refuses to decide "is this credential valid?" from the
 * status code.
 *
 * ## No rate-limit or quota surface
 *
 * The word "rate limit" does not appear anywhere in the swagger document, and
 * no response Streamtime served carried `X-RateLimit-*`, `RateLimit-*` or
 * `Retry-After`. See `health/quota.ts`.
 *
 * ## Response shapes
 *
 * Entities come back bare — no `{data: …}` envelope — and list endpoints answer
 * a bare JSON array. Two document endpoints are not JSON at all:
 * `GET /{quotes,invoices}/{id}/html` answers `text/html`, and
 * `GET /{quotes,invoices}/{id}/pdf` answers `application/pdf` bytes.
 */

/** API origin. `servers[0].url` minus the path prefix; there is no second server. */
export const API_BASE = "https://api.streamtime.net";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

/**
 * The body Streamtime returns for *every* unauthorised request — missing
 * credential, invalid credential, or a path that does not exist. Compared
 * exactly, because that is the only thing on the wire that distinguishes
 * "not authorised" from anything else.
 */
export const UNAUTHORISED_BODY = "You are not authorised to make this request";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialised as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `private: false` and `offset: 0` are both meaningful
 * on this API and silently dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined | null | ""> } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as { [K in keyof T]?: Exclude<T[K], undefined | null | ""> };
}

/**
 * Render a path id. Ids on this API are integers, so anything else is escaped
 * rather than trusted — a `/` or `?` pasted into an id field must not be able
 * to reshape the request.
 */
export function encodeId(id: number | string): string {
  const s = String(id ?? "").trim();
  return /^\d+$/.test(s) ? s : encodeURIComponent(s);
}

/** Keep an error message readable; a vendor body can be long. */
export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Is this response Streamtime's "not authorised" answer?
 *
 * **From the body, never from the status alone.** The status happens to be 401
 * for every rejection observed, but it is also 401 for a path that does not
 * exist, and a host that later fronted the API with a differently-behaving
 * gateway would move the code without moving the meaning. The body is the
 * vendor's own statement of what happened.
 */
export function isNotAuthorised(body: string): boolean {
  return body.trim() === UNAUTHORISED_BODY;
}

/**
 * Format a failure so it names the problem the caller actually has.
 *
 * The vendor's 401 body is a sentence, not a code, so it is quoted verbatim and
 * paired with the one fix that applies: the token comes from Company Settings
 * inside the Streamtime app.
 */
export function formatStreamtimeError(
  status: number,
  method: string,
  path: string,
  body: string,
): string {
  const where = `Streamtime ${status} for ${method} ${path}`;
  if (isNotAuthorised(body)) {
    return `${where}: ${UNAUTHORISED_BODY} (Streamtime says this for a missing token, an ` +
      "invalid token and an unknown path alike — check the token from Company Settings, and " +
      "check the id really exists)";
  }
  if (!body) return `${where}: no response body`;
  return `${where}: ${truncate(body)}`;
}

export class StreamtimeClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body of a successful request. A bare array stays a bare array. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A document endpoint's body verbatim.
   *
   * `GET /quotes/{id}/html` and `GET /invoices/{id}/html` answer `text/html`,
   * not JSON; passing them through {@link StreamtimeClient.request} would turn a
   * generated document into a parse error.
   */
  async text(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ text: string; contentType: string }> {
    const res = await this.send(path, { ...options, accept: options.accept ?? "*/*" });
    return {
      text: res.status === 204 ? "" : await res.text(),
      contentType: res.headers.get("content-type") ?? "",
    };
  }

  /** Raw bytes, for the PDF endpoints. */
  async bytes(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ bytes: Uint8Array; contentType: string }> {
    const res = await this.send(path, { ...options, accept: options.accept ?? "*/*" });
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  /** Status only, for endpoints whose success body carries nothing worth keeping. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    return (await this.send(path, options)).status;
  }

  /**
   * Status **and** body, in one call.
   *
   * Used by the handful of routes the document types as an open object
   * (`additionalProperties: true`, no fields): the action reports the status
   * code alongside whatever came back instead of pretending to know the shape.
   * One request, not two — a second call to read a body this one already has
   * would double the load on a per-minute health budget for nothing.
   */
  async statusAndJson<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; body: T | undefined }> {
    const res = await this.send(path, options);
    const text = await res.text();
    let body: T | undefined;
    try {
      body = text ? JSON.parse(text) as T : undefined;
    } catch {
      body = undefined;
    }
    return { status: res.status, body };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // The one array-valued query parameter in this API
      // (`saved_segment_type_ids`) is documented as "provide as a JSON array in
      // the query string", so an array is JSON-encoded rather than repeated.
      url.searchParams.set(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
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
      throw new Error(
        formatStreamtimeError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}

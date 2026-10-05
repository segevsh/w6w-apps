import type { HookContext } from "@w6w/types";

/**
 * Salesmsg public API v2.3 REST client.
 *
 * Every path, verb, parameter and scope in this app was read off the vendor's OpenAPI 3.0 document
 * (`https://app.salesmessage.com/api/docs/salesmessage-public-api-v2.3.json`, fetched 2026-10-05)
 * and the live API was probed unauthenticated on the same day. `servers[0].url` is
 * `https://api.salesmessage.com/pub/v2.3`; the OAuth pages live on `app.salesmessage.com`, which
 * this app never calls.
 *
 * ## Query string first, JSON body second
 *
 * The document declares most write operations (`POST /contacts`, `POST /messages`,
 * `POST /tags`, `PUT /tags/{tag}`, `POST /conversations`, `POST /conversations/{id}/reassign`) with
 * their fields as **query parameters**, and no request body at all. Only `PUT /contacts/{contact}`
 * and `POST /contacts/list` take a JSON body. {@link SalesmsgClient.json} sends whichever the
 * action asks for, and the actions follow the document operation by operation.
 *
 * ## There is no common response envelope
 *
 * Collections answer an array (`/teams`, `/conversations`, `/organization/members`), `{data: []}`
 * (`/tags`, `/contacts/list`, paginated messages, which add a `meta` block) or `{results: []}`
 * (`/contacts/search`). {@link SalesmsgClient.items} normalises all three to `{items, meta}`.
 *
 * ## Auth is not built here
 *
 * Nothing in this module sets a credential header. `ctx.fetch` routes through the Auth `sign`
 * hook (`auth/access-token.ts`), the only code handed the token.
 */

export const API_BASE = "https://api.salesmessage.com";
export const API_PREFIX = "/pub/v2.3";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface RequestOptions {
  method?: string;
  /** Array values are repeated under the same key, which is how PHP reads `key[]=a&key[]=b`. */
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface Items<T> {
  items: T[];
  /** The vendor's pagination block (`meta`), verbatim, when the endpoint sends one. */
  meta?: Record<string, unknown>;
}

/** Salesmsg's error body: `{message, status?, auth_required?}`, observed live. */
export interface ErrorBody {
  message?: string | null;
  status?: number;
  auth_required?: boolean;
  errors?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Escape a caller-supplied path segment. */
export function encodePathSegment(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** Accept a list however the form handed it over: `string[]` or a comma-separated string. */
export function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Parse an error body, or `undefined` when it is not a JSON object. Never throws. */
export function parseErrorBody(text: string): ErrorBody | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ErrorBody;
    }
  } catch {
    // Not JSON. The caller keeps the raw text.
  }
  return undefined;
}

/**
 * Does this error body say the credential was refused?
 *
 * Observed live 2026-10-05 against `GET /pub/v2.3/users/me` and `/teams`: no token answers
 * `401 {"message":"Unauthorized","auth_required":false}`; a malformed token answers
 * `403 {"message":"Could not decode token: …","auth_required":true}` on one route and
 * `500 {"message":null}` (`AuthorizerConfigurationException`) on another. The status is therefore a
 * hint only — the body's own wording is what is read.
 */
export function isCredentialRefusal(status: number, body: ErrorBody | undefined): boolean {
  const message = (body?.message ?? "").toString();
  if (
    /unauthori[sz]ed|unauthenticated|decode token|invalid token|expired token|token/i.test(message)
  ) {
    return true;
  }
  if (body?.auth_required === true) return true;
  return status === 401;
}

/** One readable line from a failed request. */
export function formatSalesmsgError(
  status: number,
  method: string,
  path: string,
  bodyText: string,
): string {
  const body = parseErrorBody(bodyText);
  const head = `Salesmsg returned ${status} for ${method} ${path}`;
  const detail = body
    ? [body.message, body.errors ? JSON.stringify(body.errors) : undefined].filter(Boolean).join(
      " ",
    )
    : truncate(bodyText, 300);

  const advice = (() => {
    if (isCredentialRefusal(status, body)) {
      return "the access token was rejected — create a fresh Personal Access Token under " +
        "Settings > Developer > Access Tokens in Salesmsg and reconnect";
    }
    if (status === 403) return "the token is live but not allowed to perform this operation";
    if (status === 404) return "the resource was not found — check the ID";
    if (status === 429) {
      return "rate limited (the documented global limit is 60 requests per minute) — retry later";
    }
    return undefined;
  })();

  return truncate([head, detail, advice].filter(Boolean).join(": "), 1000);
}

export class SalesmsgClient {
  constructor(private ctx: HookContext) {}

  /** The parsed body. `undefined` for a `204`, or a `200` with no body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    return JSON.parse(text) as T;
  }

  /**
   * A collection, normalised from an array, `{data}` or `{results}` to `{items, meta}`. A body of
   * any other shape comes back whole in `meta`, with `items` empty.
   */
  async items<T = unknown>(path: string, options: RequestOptions = {}): Promise<Items<T>> {
    const body = await this.json<unknown>(path, options);
    if (Array.isArray(body)) return { items: body as T[] };
    const obj = (body ?? {}) as Record<string, unknown>;
    const rows = Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.results)
      ? obj.results
      : null;
    // An unrecognised shape is returned whole under `meta` rather than dropped as an empty page.
    if (!rows) return { items: [], meta: obj };
    const meta = obj.meta && typeof obj.meta === "object"
      ? obj.meta as Record<string, unknown>
      : undefined;
    return meta ? { items: rows as T[], meta } : { items: rows as T[] };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSalesmsgError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}

import type { HookContext } from "@w6w/types";

/**
 * SimpleTexting API v2 REST client.
 *
 * Every path, verb, query parameter, body field and enum in this app was read
 * off the OpenAPI 3.0 document embedded in `https://api-doc.simpletexting.com/`
 * (extracted 2026-09-22 by a balanced-brace scan of the page's inline spec —
 * the page is a static renderer, there is no fetchable `.json`) and
 * cross-checked against live probes of `https://api-app2.simpletexting.com/v2`
 * on the same day. Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix, no regional variants
 *
 * `servers[0].url` is `https://api-app2.simpletexting.com/v2`, and the document
 * declares no other server: no regional host, no sandbox. `simpletexting.com`
 * and `api-doc.simpletexting.com` are documentation hosts and are never called.
 *
 * ## Two success shapes, not one
 *
 * - **The entity itself.** `GET /api/tenant` answers `{email}`; a contact, list,
 *   message or campaign answers the object directly — there is no `data`
 *   envelope anywhere in this API.
 * - **The page envelope.** Every collection answers
 *   `{content: [...], totalPages, totalElements}`, including the ones whose rows
 *   are the thing you wanted. {@link SimpleTextingClient.page} normalises that
 *   shape, so a workflow looping a page cursor reads the same three fields
 *   whatever it is listing.
 *
 * Deletes answer `204` with **no body at all**, so {@link
 * SimpleTextingClient.status} exists rather than pretending every response
 * parses as JSON.
 *
 * ## Errors are `application/problem+json`
 *
 * Observed live on 2026-09-22 against `GET /v2/api/tenant`:
 *
 *     {"status":"UNAUTHORIZED","errorCode":"ERR_AUTH_TOKEN_INVALID",
 *      "code":"ERR_AUTH_TOKEN_INVALID","message":"Tenant not found for provided token",
 *      "errorDetails":[],"path":"/v2/api/tenant","timestamp":1790094471.709778181}
 *
 * `errorCode` and `code` carried the same value in both probes; both are read,
 * `errorCode` first, because the document itself does not describe the error
 * schema at all — only the paths and the success entities.
 *
 * ## Auth is not built here
 *
 * Nothing in this module sets a credential header. `ctx.fetch` routes through
 * the Auth `sign` hook, which is the only code handed the token
 * (`auth/api-key.ts`).
 */

/** The one and only API origin. The document declares no other server. */
export const API_BASE = "https://api-app2.simpletexting.com";

/** Every documented path in this app's surface carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * `PageView*` — the envelope every collection endpoint answers with.
 *
 * `totalPages` and `totalElements` are integers in the document, and both are
 * optional here only because a page past the end comes back with neither.
 */
export interface Page<T> {
  content: T[];
  totalPages?: number;
  totalElements?: number;
}

/** SimpleTexting's error envelope, as observed on the wire. */
export interface ProblemDetails {
  status?: string;
  errorCode?: string;
  code?: string;
  message?: string;
  errorDetails?: unknown;
  path?: string;
  timestamp?: number;
}

/**
 * The two `errorCode`s the auth probe classifies — both come with HTTP 401, so
 * the body is the only thing that separates "the token is wrong" from "no token
 * arrived". Documented and observed live on 2026-09-22.
 */
export const AUTH_ERROR_CODES = {
  missing: "ERR_AUTH_TOKEN_MISSING",
  invalid: "ERR_AUTH_TOKEN_INVALID",
} as const;

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `upsert=false` and `page=0` are both meaningful, and
 * dropping either would make it impossible to express. Only `undefined`, `null`
 * and the empty string — "the form field was left blank" — are treated as
 * absent.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Escape a caller-supplied path segment.
 *
 * This API addresses four resources by *name or id* — `contactIdOrNumber`,
 * `listIdOrName` (twice), `contactPhoneOrId`, `mediaItemId` — so the value can
 * be a phone number (`+15551234567`), an account phone, or a list name with
 * spaces in it (`My First List`). `encodeURIComponent` leaves `~` and `-` alone
 * and neutralises a `/`, `?` or `#` someone pastes into an id field; the server
 * decodes the segment back before matching, which is how the vendor's own
 * examples (`.../contact-lists/My First List`) reach it already encoded.
 */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/**
 * Accept a list-shaped param however the form handed it over.
 *
 * A `type: "array"` param arrives as `string[]`, but a value typed into a
 * single field arrives as the comma-separated string the user wrote. Both are
 * accepted rather than failing on the one the host did not produce.
 */
export function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/** Keep an error message readable — a problem body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Parse a `problem+json` body, or `undefined` when it is not one.
 *
 * Never throws: the body of a failed request is evidence, and an unparseable
 * one must not replace the HTTP status with a JSON error of our own.
 */
export function parseProblem(text: string): ProblemDetails | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ProblemDetails;
    }
  } catch {
    // Not JSON. The caller keeps the raw text.
  }
  return undefined;
}

/** The machine code from a problem body. `errorCode` first, then `code`. */
export function problemCode(problem: ProblemDetails | undefined): string | undefined {
  return problem?.errorCode ?? problem?.code;
}

/**
 * One readable line from a failed request.
 *
 * The status is always included; the vendor's own `errorCode` and `message` are
 * appended verbatim when the body carries them, because "HTTP 400" hides which
 * of several things went wrong. A `401` gets an explicit sentence naming the
 * connection, since in this API every 401 is a statement about the token
 * (verified live: both the missing and the invalid case answer 401, and the
 * `sign` hook's `Bearer` prefix is the other thing that can be wrong — a token
 * sent without the scheme answers `ERR_AUTH_TOKEN_INVALID`, not a scheme error).
 */
export function formatSimpleTextingError(
  status: number,
  method: string,
  path: string,
  bodyText: string,
): string {
  const problem = parseProblem(bodyText);
  const code = problemCode(problem);
  const head = `SimpleTexting returned ${status}${code ? ` ${code}` : ""} for ${method} ${path}`;
  const detail = problem?.message ?? (problem ? undefined : truncate(bodyText, 300));

  const advice = (() => {
    if (status === 401 || code === AUTH_ERROR_CODES.invalid || code === AUTH_ERROR_CODES.missing) {
      return "the access token was rejected — mint a fresh personal access token in " +
        "SimpleTexting under Settings > API and reconnect";
    }
    if (status === 403) return "the token is live but not allowed to perform this operation";
    if (status === 404) return "the resource was not found — check the ID or phone number";
    return undefined;
  })();

  return truncate([head, detail, advice].filter(Boolean).join(": "), 1000);
}

export class SimpleTextingClient {
  constructor(private ctx: HookContext) {}

  /** The parsed body. `undefined` for a `204`, or for a `200` with no body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    return JSON.parse(text) as T;
  }

  /**
   * The page envelope, with `content` normalised to an array and the vendor's
   * own `totalPages` / `totalElements` kept verbatim.
   */
  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const body = await this.json<Partial<Page<T>>>(path, options);
    return {
      content: Array.isArray(body?.content) ? body.content : [],
      totalPages: body?.totalPages,
      totalElements: body?.totalElements,
    };
  }

  /** Status only, for the endpoints that answer `204` with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    await res.body?.cancel();
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
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
      throw new Error(formatSimpleTextingError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}

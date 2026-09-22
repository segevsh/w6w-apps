import type { HookContext } from "@w6w/types";

/**
 * ScoreApp Open API client — `https://open-api.scoreapp.com`.
 *
 * Everything in this module was verified on 2026-09-22 against ScoreApp's own
 * reference article, "ScoreApp Public API - Getting Started"
 * (`support.scoreapp.com/article/217-scoreapp-public-api-getting-started`, last
 * updated 2026-08-03 — the *complete* reference: every endpoint, parameter,
 * response shape and status code ScoreApp documents lives on that one page) plus
 * live probes against `open-api.scoreapp.com`. Nothing here came from a
 * third-party integration directory, and no path was inferred from a sibling
 * app.
 *
 * ## The host is not the one you would guess
 *
 * `api.scoreapp.com` and `developer.scoreapp.com` both answer `302` to
 * `www.scoreapp.com` — the marketing site, not an API. The real origin is
 * `open-api.scoreapp.com`, verified live: all six documented paths answer
 * `401 {"error":"Unauthenticated."}`, never a `404` and never an HTML shell.
 *
 * ## `Accept: application/json` is load-bearing
 *
 * ScoreApp is a Laravel application, and Laravel's default behaviour for an
 * unauthenticated request that does *not* ask for JSON is a `302` to `/login`
 * with an HTML body. So without this header every auth failure looks like a
 * redirect problem instead of a credential problem — the worst possible failure
 * mode for a health probe to misclassify. {@link ACCEPT_JSON} is therefore sent
 * on every request this app makes (see {@link ScoreAppClient.send}, and the
 * `test` hook in `../auth/api-key.ts`), and {@link ScoreAppClient.json} refuses
 * to hand back a non-JSON body rather than letting a login page be parsed as a
 * result set.
 *
 * ## One envelope, Laravel-shaped pagination
 *
 * Every documented read answers `{"data": …}`. The two list endpoints
 * (`/scorecards` and `/scorecards/{scorecard}/results`) add the Laravel
 * page-based `links` ({first, last, prev, next}) and `meta`
 * ({current_page, from, last_page, path, per_page, to, total}) members. The
 * `questions`, `categories` and `answers` reads are *not* paginated — they
 * return the full `data` array.
 *
 * ## Identifiers are opaque strings, deliberately
 *
 * The vendor's documentation contradicts itself: the `List Scorecards` response
 * example shows a UUID id (`"9e01daab-49c6-428b-9209-b5b0607acad3"`) while the
 * `results`/`categories`/`questions` endpoints document their `{scorecard}` and
 * `{result}` path parameters as `(integer, required)` and use small integers in
 * their example URLs. This app resolves that by never deciding: every path id is
 * declared as a `string` param, passed through verbatim, and never coerced or
 * validated as a number — which is the safe reading whichever shape a given
 * account actually has. {@link encodeId} trims and escapes it so a pasted slash
 * or query character cannot escape into the path, and leaves both UUIDs and
 * integers byte-identical.
 *
 * ## Errors
 *
 * The documented failure body is `{"error": "<message>"}`, and the observed one
 * for a missing/bad credential is exactly `{"error":"Unauthenticated."}` at
 * `401`. `422` is a *validation* error on the query parameters, `403` is
 * documented on the result reads for Pro-plan-only data, and `429` is the rate
 * limit. {@link formatScoreAppError} keeps those apart, because collapsing them
 * to "HTTP 401" hides which fix applies.
 *
 * ## Rate limits are real, and readable — unlike most vendors in this pack
 *
 * Every response, including the unauthenticated `401`s, carries
 * `x-ratelimit-limit` and `x-ratelimit-remaining`, and `x-ratelimit-remaining`
 * genuinely decrements per request (measured live: six consecutive calls
 * returned 119 → 114). No reset header was observed. Note the vendor's own
 * doc/wire mismatch: the article says "100 requests per minute", the live header
 * says `120`. Nothing here hardcodes either number — `../health/rate-limit.ts`
 * reads the headers.
 */

/**
 * The one and only API origin.
 *
 * Not `api.scoreapp.com` and not `developer.scoreapp.com`: both are `302` to the
 * marketing site (verified live 2026-09-22). Do not "tidy" this constant.
 */
export const API_BASE = "https://open-api.scoreapp.com";

/**
 * The header every request must carry.
 *
 * Without it Laravel answers an unauthenticated request with a `302` to its
 * login page instead of the documented JSON error — see the file header.
 */
export const ACCEPT_JSON = "application/json";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  /** Single-valued query parameters. Unset values are dropped — see {@link compact}. */
  query?: Record<string, QueryValue>;
  /**
   * Query parameters that REPEAT, as `name[]=a&name[]=b`.
   *
   * Only `include[]` on the single-result read uses this, and it is the vendor's
   * own documented form (`?include[]=answers&include[]=scores`). It is a
   * separate field rather than an array value in `query` because a comma-joined
   * value is a *different* request: these are repeated keys, not one CSV string.
   */
  repeat?: Record<string, string[]>;
}

/**
 * ScoreApp's paginated list envelope.
 *
 * `links`/`meta` are the vendor's Laravel page-based members; their inner shapes
 * are left as the wire sends them, since this app's contract is to return the
 * documented response untouched.
 */
export interface ScoreAppPage<T = unknown> {
  data: T[];
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta?: Record<string, unknown>;
}

/** The `{"data": …}` envelope every *non*-paginated read answers. */
export interface ScoreAppEnvelope<T = unknown> {
  data: T[];
}

/** The documented failure body. */
export interface ScoreAppErrorBody {
  error?: string;
}

/** The one auth-failure string ScoreApp documents and the wire actually sends. */
export const UNAUTHENTICATED = "Unauthenticated.";

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: a caller who manages to express them means them, and
 * silently dropping them would make them impossible to express. The empty string
 * is genuinely absent here — no ScoreApp filter has a meaningful empty value.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 400): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied resource id.
 *
 * ScoreApp's ids are either UUIDs or small integers depending on which part of
 * the vendor's own documentation you read (see the file header), so this
 * function deliberately does not care which it got. `encodeURIComponent` leaves
 * UUIDs and integers byte-identical while still neutralising a `/` or `?` that a
 * caller pasted in by mistake.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** `/scorecards/{scorecard}` — the prefix of four of the six documented reads. */
export function scorecardPath(scorecard: string): string {
  return `/scorecards/${encodeId(scorecard)}`;
}

/** `/scorecards/{scorecard}/results/{result}` — the single-result read. */
export function resultPath(scorecard: string, result: string): string {
  return `${scorecardPath(scorecard)}/results/${encodeId(result)}`;
}

/** Parse a body without assuming it is JSON. Returns `undefined` when it is not. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The `error` string out of a body, or `undefined`.
 *
 * ScoreApp's shape is `{"error": "…"}` — a bare string, unlike Apify's nested
 * `{"error": {"type", "message"}}`. Reading it by name rather than by status is
 * what the pack's rule requires: a 401 is not by itself the answer.
 */
export function errorText(body: unknown): string | undefined {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return undefined;
  const value = (body as ScoreAppErrorBody).error;
  return typeof value === "string" ? value : undefined;
}

/** Is this ScoreApp's documented auth failure — classified from the BODY, never the status alone? */
export function isUnauthenticated(body: unknown): boolean {
  return errorText(body) === UNAUTHENTICATED;
}

/**
 * Turn a ScoreApp failure into one actionable line.
 *
 * The status alone is not enough: `401` with `{"error":"Unauthenticated."}` and
 * `422` (a query-parameter validation error) and `429` (the rate limit) are three
 * different problems with three different fixes, and the pack's rule is explicit
 * that they must not be conflated. The vendor's own `error` string is surfaced
 * verbatim when the body carries one.
 *
 * Nothing here can echo a credential: ScoreApp's documented shapes contain no
 * key material at all, and this function only ever formats the caller's own
 * input and the vendor's own prose.
 */
export function formatScoreAppError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const error = errorText(parseJson(raw));
  const parts = [`ScoreApp ${status} for ${method} ${path}`];

  if (error) parts.push(error);
  else if (raw) parts.push(truncate(raw));

  if (status === 401 && error === UNAUTHENTICATED) {
    parts.push(
      "the API key is missing or was rejected — reconnect this connection with a key from " +
        "ScoreApp > Account settings > API keys",
    );
  }
  if (status === 422) {
    parts.push("422 is a query-parameter validation error, not an auth failure");
  }
  if (status === 403) {
    parts.push(
      "403 is documented on the result reads for Pro-plan-only data " +
        "(include[]=additional_data needs an email address on the result)",
    );
  }
  if (status === 429) {
    parts.push(
      "ScoreApp rate-limits the Open API (the docs say 100 requests/minute, the live " +
        "x-ratelimit-limit header says 120); retry after the window rolls over",
    );
  }

  return truncate(parts.join(": "), 1000);
}

export class ScoreAppClient {
  constructor(private ctx: HookContext) {}

  /**
   * The response body, parsed, returned **without transformation**.
   *
   * Every action in this app returns the vendor's own envelope — `{data}`, or
   * `{data, links, meta}` on the two paginated reads — because that is the
   * documented response shape and `meta.total`/`links.next` are how a workflow
   * decides whether to keep paging. Unwrapping to `data` here would drop them.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, method, pathname } = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;

    const parsed = parseJson(text);
    if (parsed === undefined) {
      throw new Error(
        `ScoreApp did not return JSON for ${method} ${pathname}: ${truncate(text, 160)}. ` +
          "The Open API answers JSON only when the request carries `Accept: application/json`; " +
          "without it Laravel answers an unauthenticated request with a 302 to its login page.",
      );
    }
    return parsed as T;
  }

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ res: Response; method: string; pathname: string }> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, String(v));
    }
    for (const [k, values] of Object.entries(options.repeat ?? {})) {
      for (const v of values) url.searchParams.append(k, v);
    }

    // The Open API documents no verb but GET, and no request body.
    const method = "GET";
    const res = await this.ctx.fetch(url.toString(), {
      method,
      headers: { accept: ACCEPT_JSON },
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(formatScoreAppError(res.status, method, url.pathname, raw));
    }
    return { res, method, pathname: url.pathname };
  }
}

import type { HookContext } from "@w6w/types";

/**
 * Buffer GraphQL Public API client.
 *
 * ## Which Buffer API this is — and why the old one is not it
 *
 * Buffer has had two developer surfaces, and almost everything written about
 * "the Buffer API" before mid-2026 describes the wrong one.
 *
 *   | Surface                | Base                          | Status                                    |
 *   | ---------------------- | ----------------------------- | ----------------------------------------- |
 *   | Legacy REST API (2012) | `api.bufferapp.com/1/`        | **Retiring 2027-02-01.** Closed to new apps |
 *   | GraphQL Public API     | `https://api.buffer.com`      | GA since May 2026 — **this app**          |
 *
 * Buffer's own retirement notice is unambiguous about both halves: the legacy
 * REST API is "being fully retired", "Requests to legacy endpoints will no
 * longer return data" after 2027-02-01, with brownouts on 2026-11-11 and
 * 2026-12-09; and its replacement is "a strongly typed, GraphQL-first API with
 * an MCP server, a CLI, and managed OAuth, running on the same infrastructure
 * as our own apps" (<https://buffer.com/resources/legacy-rest-api-retired/>,
 * fetched 2026-08-03).
 *
 * That distinction is the reason this app exists at all. For years the honest
 * answer to "can you build a Buffer integration?" was *no* — Buffer had stopped
 * registering new developer apps against the legacy API, so a new integration
 * had no path to a credential. That is no longer true: an API key is
 * self-serve at Settings → API on every plan including Free, and OAuth clients
 * are self-serve on the same page. Verified on the wire, 2026-08-03 (below).
 *
 * ## One endpoint, one host, no per-tenant base URL
 *
 * Everything is a `POST` to the bare origin — not `/graphql`, not a versioned
 * path. Buffer's own examples in every language post to `'https://api.buffer.com'`
 * with no path component (`guides/authentication.html`, `guides/api-limits.html`,
 * and all eleven `examples/*.html` pages).
 *
 * `POST https://api.buffer.com/graphql` also answers, and identically — both
 * returned the same `{"errors":[{"message":"An authentication JWT or Access
 * Token is required","extensions":{"code":"UNAUTHENTICATED"}}]}` on 2026-08-03.
 * The documented form is the one used here; an undocumented alias that happens
 * to work today is not a contract.
 *
 * There is nothing to parameterise per tenant. Buffer is fully vendor-hosted,
 * one origin serves every account, and the *organization* — not a subdomain and
 * not a header — scopes a query. That is why `network.allow` is the single
 * literal `api.buffer.com` and why every list action takes an
 * `organizationId` parameter.
 *
 * ## The failure modes, and why `res.ok` is not one of them
 *
 * This is the part most likely to be got wrong, so it is spelled out. Buffer
 * fails in **three** structurally different ways, only one of which shows up in
 * the status line:
 *
 *  1. **Transport-level rejection — a real non-2xx.** Verified on the wire,
 *     2026-08-03:
 *
 *     | Request                                             | HTTP | Body                                                            |
 *     | --------------------------------------------------- | ---- | --------------------------------------------------------------- |
 *     | `POST /` no `Authorization`                         | 401  | `{"errors":[{"message":"An authentication JWT or Access Token is required","extensions":{"code":"UNAUTHENTICATED"}}]}` |
 *     | `POST /` `Authorization: Bearer bogus_key_123`      | 401  | `{"errors":[{"message":"Access token is not valid","extensions":{"code":"UNAUTHENTICATED"}}]}` |
 *     | `GET /`                                             | 401  | same JSON envelope                                                |
 *     | rate limit exhausted (documented, not reproduced)   | 429  | `{"errors":[{…,"extensions":{"code":"RATE_LIMIT_EXCEEDED","window":"15m"}}]}` |
 *
 *  2. **HTTP 200 with a populated `errors` array.** Buffer states this plainly:
 *     *"GraphQL always returns HTTP 200. Check the response body to determine
 *     success or failure."* — `guides/error-handling.html`. Documented codes:
 *     `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `UNEXPECTED`,
 *     `RATE_LIMIT_EXCEEDED`. Query-limit violations (complexity, depth,
 *     aliases, directives, tokens) arrive here too, with no `extensions.code`
 *     at all.
 *
 *  3. **HTTP 200, NO `errors` array, and a failure inside `data`.** This is the
 *     nastiest arm and it is unique to the mutations. Every Buffer mutation
 *     returns a *union*, and the error arms are ordinary members of it:
 *     *"Typed mutation errors … In the response data … User-fixable problems
 *     (validation, limits) … HTTP Status 200"*. A failed `createPost` is
 *     literally `{"data":{"createPost":{"message":"Text is required"}}}` —
 *     `res.ok` is true, `body.errors` is absent, and a client that stopped
 *     checking there would hand a workflow an error object shaped like a post.
 *
 * So `request()` checks all three, in that order, and `unwrapMutation()` exists
 * solely to make (3) impossible to forget: every mutation in this app selects
 * `__typename` plus a `... on MutationError { message }` catch-all, and routes
 * the payload through it.
 *
 * The catch-all is not belt-and-braces, it is Buffer's own instruction:
 * *"Always include `... on MutationError` in every mutation … Because all error
 * types implement the `MutationError` interface, any error type you don't
 * explicitly handle will still return a message."* Buffer even ships a
 * `VoidMutationError` member it never returns, purely so unions stay
 * future-proof against new error arms.
 *
 * ## Documented code vs. observed code
 *
 * The error-handling page's table names `UNAUTHORIZED` for "missing or invalid
 * API key". The live API returns **`UNAUTHENTICATED`** for exactly that case,
 * twice over (no header, and bad header). Both spellings are therefore treated
 * as credential failures throughout this app. Neither is guessed at: one comes
 * from the published table, the other off the wire.
 *
 * ## What this client does NOT do
 *
 * It never sets `Authorization`. That header is stamped by `auth/api-key.ts`'s
 * `sign` hook, or by the runtime for `auth/oauth2.ts` — the only two places a
 * Buffer credential is visible. Actions reach the network exclusively through
 * this module, and this module exclusively through `ctx.fetch`.
 *
 * Errors never echo the request body or the variables. A GraphQL request body
 * is user data plus a query string; the credential is not in it, but nothing is
 * gained by quoting it back and an error message is where things leak by
 * accident.
 */

/** The one host this app talks to. Mirrored by `w6w.network.allow`. */
export const API_HOST = "api.buffer.com";

/**
 * The GraphQL endpoint. The bare origin, no path — see the doc comment above.
 * Every operation in this app is a `POST` here.
 */
export const API_URL = `https://${API_HOST}`;

/** A single entry of the GraphQL `errors` array. */
export interface BufferGraphQLError {
  message?: string;
  extensions?: { code?: string; window?: string };
}

export interface BufferGraphQLResponse<T = unknown> {
  data?: T | null;
  errors?: BufferGraphQLError[];
}

/**
 * `extensions.code` values that mean "your credential is the problem".
 *
 * Two spellings because the docs and the live API disagree — see the doc
 * comment. Exported so `auth/*.ts` and the tests classify identically rather
 * than each keeping a private list that drifts.
 */
export const CREDENTIAL_ERROR_CODES = ["UNAUTHENTICATED", "UNAUTHORIZED"] as const;

export function isCredentialError(code: string | undefined): boolean {
  return code !== undefined && (CREDENTIAL_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Render the `errors` array into one line.
 *
 * Only the first error drives the message — Buffer returns the operative
 * failure first and additional entries are usually the same fact restated per
 * field — but the count is reported so nothing looks silently dropped.
 */
export function formatGraphQLErrors(errors: BufferGraphQLError[]): string {
  const first = errors[0];
  const code = first?.extensions?.code;
  const window = first?.extensions?.window;
  const parts = [first?.message ?? "unspecified GraphQL error"];
  if (code) parts.push(`code ${code}`);
  if (window) parts.push(`window ${window}`);
  if (errors.length > 1) parts.push(`+${errors.length - 1} more`);
  return parts.join("; ");
}

/**
 * Turn one raw HTTP response into `data`, or throw.
 *
 * Split out of `request` and exported so the auth `test` hooks and the unit
 * tests exercise the same three-arm check the actions do. Order matters: the
 * `errors` array is inspected *before* the status line, because a 429 carries
 * both and the body is the half that says which window was exhausted.
 */
export function parseGraphQLBody<T>(status: number, text: string): T {
  let body: BufferGraphQLResponse<T>;
  try {
    body = JSON.parse(text) as BufferGraphQLResponse<T>;
  } catch {
    // Cloudflare sits in front of this origin, so a non-JSON body is most
    // likely an edge error page rather than anything Buffer wrote.
    throw new Error(
      `Buffer returned HTTP ${status} with a non-JSON body (${text.slice(0, 200) || "empty"})`,
    );
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    throw new Error(`Buffer GraphQL error: ${formatGraphQLErrors(body.errors)}`);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Buffer returned HTTP ${status} with no GraphQL error to explain it`);
  }

  if (body.data === null || body.data === undefined) {
    throw new Error("Buffer returned neither `data` nor `errors`");
  }

  return body.data;
}

/**
 * Unwrap a mutation union, throwing on any arm that is not a success type.
 *
 * The third failure mode from the doc comment: HTTP 200, no `errors`, and an
 * error sitting in `data` wearing the shape of a result. Every mutation here
 * selects `__typename` so this function has something to switch on, and every
 * mutation lists `... on MutationError { message }` last so an arm nobody
 * anticipated still arrives with a readable message.
 *
 * `RestProxyError` — the arm Buffer returns when the *social network* rejects
 * the post rather than Buffer itself — carries `link` and `code` alongside
 * `message`, and both are surfaced: "Instagram rejected this" and "Buffer
 * rejected this" need different fixes, and the link is Buffer's own help page
 * for the specific rejection.
 */
export interface MutationErrorArm {
  __typename?: string;
  message?: string;
  link?: string;
  code?: string | number;
}

export function unwrapMutation<T>(
  payload: unknown,
  field: string,
  successTypes: readonly string[],
): T {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    throw new Error(`Buffer ${field} returned no payload`);
  }

  const arm = payload as MutationErrorArm;
  if (arm.__typename !== undefined && successTypes.includes(arm.__typename)) {
    return payload as T;
  }

  const parts: string[] = [];
  if (arm.__typename) parts.push(arm.__typename);
  if (arm.message) parts.push(arm.message);
  if (arm.code !== undefined) parts.push(`code ${arm.code}`);
  if (arm.link) parts.push(arm.link);
  if (parts.length === 0) {
    // No `__typename`, no message. Either the selection set lost `__typename`
    // or Buffer changed the union shape; either way, guessing that it worked
    // would be the one unrecoverable answer.
    parts.push("unrecognised response shape");
  }
  throw new Error(`Buffer ${field} failed: ${parts.join(" — ")}`);
}

export class BufferClient {
  constructor(private ctx: HookContext) {}

  /**
   * Execute one GraphQL document and return `data`.
   *
   * Variables are always sent as a separate `variables` object rather than
   * interpolated into the query text. That is not stylistic: Buffer meters
   * queries by parsed size (15,000 tokens) and complexity (175,000 points), and
   * string interpolation is also how a user-supplied value becomes part of the
   * document instead of a value.
   */
  async request<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return parseGraphQLBody<T>(res.status, await res.text());
  }

  /**
   * Execute a mutation and unwrap its union in one step.
   *
   * Exists so no action can accidentally return the raw payload — the failure
   * that would look like success. `field` is the mutation's root field name;
   * `successTypes` the union members that mean it worked.
   */
  async mutate<T = unknown>(
    query: string,
    variables: Record<string, unknown>,
    field: string,
    successTypes: readonly string[],
  ): Promise<T> {
    const data = await this.request<Record<string, unknown>>(query, variables);
    return unwrapMutation<T>(data?.[field], field, successTypes);
  }
}

/**
 * Drop keys the caller left unset.
 *
 * `undefined`, `null` and `""` all mean "not supplied" for a form field. On
 * `editPost` the distinction matters more than usual: Buffer documents that
 * omitting `assets` *preserves* the existing list while passing `[]` *clears*
 * it, and that `mode: null` explicitly makes no scheduling change. Forwarding
 * a blank string would land in neither bucket. `false` and `0` survive,
 * because on this API they are values.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Split a comma-separated form field into the string-id array Buffer wants.
 *
 * Buffer ids are opaque strings (`ChannelId`, `PostId`, `TagId`,
 * `OrganizationId` are all custom scalars over MongoDB ObjectIds), so unlike
 * the sibling `circle` app nothing is coerced to a number — that would turn a
 * valid id into `NaN`.
 *
 * A field containing nothing usable returns `undefined` rather than `[]`,
 * because on several of these inputs an empty array is a *value*: Buffer
 * documents that `aggregatedPostMetrics` with `channelIds: []` matches no
 * channels and returns an empty result, where omitting it spans every channel.
 * A user who typed whitespace did not ask for "no channels".
 */
export function idList(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON param that a workflow author may have supplied as a string. */
export function jsonObject(
  v: unknown,
  label: string,
): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v !== "string") throw new Error(`${label} must be a JSON object`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

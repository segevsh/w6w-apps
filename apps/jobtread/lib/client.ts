import type { HookContext } from "@w6w/types";

/**
 * JobTread — the "Pave" query API.
 *
 * A single endpoint, `POST https://api.jobtread.com/pave`, speaking a JSON
 * query-by-example language ("Pave") in the spirit of GraphQL but with its
 * own grammar: field selection is nested-object shape (`{ id: {} }` means
 * "return `id`"), an object's arguments live under a sibling `$` key, and
 * connections (lists) take `$: { size, page, where, sortBy }`.
 *
 * There is no static schema doc reachable by fetch — `app.jobtread.com/docs`
 * is a client-rendered SPA. Every field, operation, and error shape used in
 * this app was confirmed one of two ways:
 *
 *   1. Live against the API's own structured validation errors (2026-09-15).
 *      Pave validates a query's SHAPE — which fields exist, which arguments
 *      are required, and argument TYPES (e.g. `Expected a JobTreadID but got
 *      "x"`) — independently of whether the credential is valid, so a
 *      deliberately-malformed `grantKey` still surfaces real, field-level
 *      errors ("The field \"foo\" does not exist at \"job\". Did you mean
 *      \"...\"", "A non-null value is required at \"createAccount\".\"$\".
 *      \"name\"") that name exactly the fields and required arguments this
 *      app relies on. Several mutations (`createLocation`, `createJob`) were
 *      confirmed all the way through argument validation to a permission
 *      check ("You don't have permission to create a location for this
 *      account"), proving the shape is not just accepted but genuinely
 *      routes to the real operation.
 *   2. Cross-referenced against `docs.md` in the open-source
 *      `sted9000/jobtread-api` repo, which reproduces JobTread's own
 *      "Getting Started" documentation verbatim (query examples, the
 *      `where`/`sortBy`/pagination grammar, the three required `createAccount`
 *      fields) — used only to corroborate shapes already confirmed live, never
 *      as a sole source.
 *
 * Two things about error responses are easy to get wrong and worth stating
 * once, here:
 *
 *   - **Errors are `text/plain`, not JSON.** `POST /pave` with a bad or
 *     malformed query answers a 4xx with a bare human-readable string body
 *     (`"A valid query is required"`, `"Supplied key is invalid or expired"`)
 *     — never a `{error: ...}` envelope. A successful call is always
 *     `content-type: application/json`. `request()` below branches on
 *     `res.ok` and reads the body as text either way, only JSON-parsing on
 *     success.
 *   - **Structural/shape errors do not require a valid `grantKey`.** JobTread
 *     validates the query tree before it validates the credential, which is
 *     exactly what made live reverse-engineering possible without a real
 *     account — but it also means a 200-shaped response is NOT by itself
 *     proof of a live credential; see `../auth/grant-key.ts` for the actual
 *     liveness probe.
 */
export const API_URL = "https://api.jobtread.com/pave";

/** A Pave field-selection subtree: `{}` selects a scalar leaf, nested keys select relations. */
export type PaveSelection = Record<string, unknown>;

/**
 * A single filter condition, `[field, operator, value]` (or `[[nested, path], operator, value]`
 * to reach into a relation) — e.g. `["type", "=", "customer"]`. Combine several with
 * `{and: [...]}` / `{or: [...]}`. Verified against `organization.accounts`/`organization.documents`
 * live (2026-09-15) — a single condition is a *flat* 3-element array, not wrapped in an outer array.
 */
export type PaveWhereCondition =
  | [string | string[], string, unknown]
  | { and: PaveWhereCondition[] }
  | { or: PaveWhereCondition[] };

export interface PaveSortBy {
  field: string;
  order?: "asc" | "desc";
}

/** Arguments accepted by every list ("connection") field this app queries. */
export interface PaveConnectionArgs {
  size?: number;
  page?: string;
  where?: PaveWhereCondition;
  sortBy?: PaveSortBy[];
}

export function connectionArgs(
  input: { size?: number; page?: string; where?: unknown; sortBy?: unknown },
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (input.size !== undefined) args.size = input.size;
  if (input.page) args.page = input.page;
  if (input.where !== undefined && input.where !== null) args.where = input.where;
  if (input.sortBy !== undefined && input.sortBy !== null) args.sortBy = input.sortBy;
  return args;
}

/**
 * Thin wrapper over `ctx.fetch`. Posts `{query}` — the credential is never set
 * here; the auth `sign` hook merges `grantKey` into `query.$` on the way out
 * (see `../auth/grant-key.ts`).
 */
export class JobTreadClient {
  constructor(private ctx: HookContext) {}

  async query<T = PaveSelection>(query: PaveSelection): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`JobTread ${res.status} ${res.statusText}: ${text || "(empty body)"}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

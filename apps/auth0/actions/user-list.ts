import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, USER_SEARCH_CAP } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/users` — search the tenant's users with Lucene syntax.
 *
 * ## Two things about this endpoint that fail silently
 *
 * **It is eventually consistent.** Auth0's own words: *"The Management API's
 * List or Search Users endpoint (`GET /users`) is eventually consistent, so
 * results may not immediately reflect recently-completed write operations."* A
 * workflow that creates a user and then searches for it can legitimately not
 * find it — and will conclude the create failed.
 *
 * **It returns at most 1,000 users**, *"even if more users match your query"*.
 * No error, no flag; the thousand-and-first simply is not there. Asking for
 * totals is how a caller can at least see the number it is being capped at,
 * which is why this action always requests them.
 *
 * When immediate consistency matters — a just-created user, an account-linking
 * decision, anything in an auth flow — `user-get` and `user-get-by-email` are
 * the endpoints to use instead. Both are immediately consistent, and this
 * action's description says so.
 *
 * ## The query language is Lucene, not SQL
 *
 * `email:"ada@example.com"`, `name:ada*`, `logins_count:[100 TO *]`,
 * `identities.connection:"google-oauth2"`. Fields are the user profile's own,
 * and `app_metadata`/`user_metadata` are searchable only if they were indexed.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "Search users",
  description:
    "Lucene search over the tenant's users. Eventually consistent and capped at 1,000 results — " +
    "use Get User or Get User By Email when either matters.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      placeholder:
        'email:"ada@example.com" AND identities.connection:"Username-Password-Authentication"',
      hint: "Lucene syntax over the user profile. Empty returns everyone, newest first.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "created_at:-1",
      hint: "`field:1` ascending, `field:-1` descending.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated fields to return. Narrowing this is the cheapest way to make a " +
        "large search fast.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "total", type: "number", label: "Total matching (capped at 1,000)" },
    { key: "capped", type: "boolean", label: "The 1,000-result ceiling was reached" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const want = returnAll ? USER_SEARCH_CAP : Math.max(1, Number(p.limit ?? 50));

    const client = new Auth0Client(ctx);
    const { items, total } = await client.requestAll<Record<string, unknown>>("/users", "users", {
      query: {
        q: String(p.query ?? "") || undefined,
        // v3 is the current (and only supported) search engine.
        search_engine: String(p.query ?? "") ? "v3" : undefined,
        sort: String(p.sort ?? "") || undefined,
        fields: String(p.fields ?? "") || undefined,
      },
    }, want);

    // Auth0 caps a search at 1,000 whatever the total says, and never mentions
    // it — so the caller is told here.
    const capped = items.length >= USER_SEARCH_CAP ||
      (typeof total === "number" && total > USER_SEARCH_CAP);
    if (capped) {
      ctx.log(
        "warn",
        `Auth0 caps a user search at ${USER_SEARCH_CAP} results — narrow the query rather than ` +
          "paging further",
        { total },
      );
    }
    return { users: items, total, capped };
  },
};

export default action;

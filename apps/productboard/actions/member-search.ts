import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `POST /v2/members/search` — look members up by a list of emails or roles.
 *
 * The reason to prefer this over `member-list`: the body takes **arrays** —
 * up to 100 ids or 100 email addresses in one call — where the query string
 * takes one search term. Reconciling a seat list against an HR system is one
 * request here and N requests there.
 *
 * Three things the vendor documents about this body that a caller will hit:
 *
 *  - `filter.fields.email` needs the PII scope. The document spells that scope
 *    two ways in the same file — `members:pii:read` (6 occurrences) and
 *    `members_pii:read` (5) — so if an email filter is rejected for scope, the
 *    spelling is worth checking against whichever the authorization server
 *    actually issued.
 *  - `filter.fields.disabled: true` returns **only** disabled members. It is an
 *    exclusive filter, not an include-flag; the include-flag lives under
 *    `return`.
 *  - `filter` is `additionalProperties: false` and unknown field names inside
 *    `filter.fields` are a 400, not a silent ignore. That is the good kind of
 *    strictness.
 */
interface Input {
  filter?: unknown;
  query?: string;
  returnOptions?: unknown;
  pageCursor?: string;
}

const memberSearch: ActionDefinition<Input, ListResult> = {
  key: "member-search",
  type: "search",
  resource: "member",
  title: "Search members",
  description:
    "Look members up by up to 100 ids or emails at once, or by role — the batch form that " +
    "List members cannot express.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      placeholder: '{"fields": {"email": ["a@example.com", "b@example.com"]}}',
      hint:
        "Keys: id (UUID or array, max 100) and fields (email, role, disabled). Email filtering " +
        "needs the PII scope. `disabled: true` returns ONLY disabled members. Unknown field " +
        "names are a 400.",
    },
    {
      key: "query",
      label: "Search term",
      type: "string",
      hint: "Sent as the body's `search.query`.",
    },
    {
      key: "returnOptions",
      label: "Return options",
      type: "json",
      placeholder: '{"includeDisabled": true}',
      hint: "Sent as the body's `return`. This is where the include-flags live — the `disabled` " +
        "filter above is an exclusive filter, not an include.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    const data = compact({
      filter: asOptionalJson<Record<string, unknown>>(input.filter, "Filter"),
      search: input.query ? { query: input.query } : undefined,
      return: asOptionalJson<Record<string, unknown>>(input.returnOptions, "Return options"),
    });
    return new ProductboardClient(ctx).list("/members/search", {
      method: "POST",
      query: { pageCursor: input.pageCursor },
      body: { data },
    });
  },
};

export default memberSearch;

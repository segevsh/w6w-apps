import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /conversations/search/{query}` — verified against Front's own OpenAPI
 * document (`search-conversations`).
 *
 * **The query is a path segment, not a query string.** Front's search syntax is
 * written into the URL path — `.../search/is:open tag:vip` — which means every
 * space, colon and quote in it has to survive URL encoding. This action encodes
 * the whole expression once, with `encodeURIComponent`, so a query containing a
 * `/` (a URL in an email body, say) cannot split the path.
 *
 * **It is rate limited harder than everything else.** Front's spec attaches a
 * note to this operation and no other: search runs at **40% of the company's
 * rate limit**. On a Starter plan's 50 rpm that is 20 searches a minute for the
 * whole company, shared with every other integration. A workflow that searches
 * per row of a list will exhaust it; one that searches once and pages the
 * result will not.
 *
 * The response is `{_results, _total, _pagination}` — `_total` counts matches
 * beyond the page, which is why a "how many" question does not need paging.
 */
const action: ActionDefinition = {
  key: "conversation-search",
  type: "search",
  resource: "conversation",
  title: "Search conversations",
  description:
    "Front's search syntax — `is:open`, `tag:`, `from:`, `inbox:`, free text. Rate limited at " +
    "40% of the company's allowance, so search once and page rather than searching per row.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      placeholder: "is:open tag:vip after:1704067200",
      hint: "Front search syntax, exactly as typed into Front's own search bar.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "searching Front conversations", { returnAll, limit });

    // The query lives in the PATH. Encoding it whole keeps a `/` inside the
    // expression from becoming another path segment.
    return await new FrontClient(ctx).requestAll(
      `/conversations/search/${encodeURIComponent(query)}`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, query, stripHtml } from "../lib/client.ts";
import { limitParam } from "../lib/params.ts";

/**
 * `GET /api/v2/search` — search this instance's view of the network.
 *
 * ## It searches what this server has seen, not the fediverse
 *
 * There is no global index. An instance holds the posts of its own users plus
 * whatever federated in — meaning anything its members follow or interacted
 * with. A large server therefore finds far more than a small one, and neither
 * finds everything. **Absence from search is not absence from the network**,
 * and no amount of paging changes that.
 *
 * ## Full-text search is usually off, and opted into per author
 *
 * Most instances run without Elasticsearch, in which case status search matches
 * only posts you wrote or interacted with. Even where it is installed, authors
 * must opt in to being searchable. So a search returning nothing may mean the
 * feature is absent, the author opted out, or the post genuinely is not here —
 * three very different things with one empty array between them.
 *
 * ## A URL in the query resolves rather than searches
 *
 * Pasting a status or account URL makes the instance **fetch** it, pulling a
 * remote object in so it can be acted on. That is the reliable way to reach
 * something the server has not seen: search for its URL first, then use the
 * local id that comes back.
 */
const action: ActionDefinition = {
  key: "status-search",
  type: "search",
  resource: "status",
  title: "Search",
  description:
    "Search this instance's view of the network — which is not the network. Pasting a URL " +
    "RESOLVES it instead, pulling a remote post or account in so it can be acted on.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      hint: "Text, a #hashtag, an @handle, or a URL. A URL is fetched rather than searched.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Everything" },
        { value: "statuses", label: "Statuses" },
        { value: "accounts", label: "Accounts" },
        { value: "hashtags", label: "Hashtags" },
      ],
    },
    {
      key: "resolve",
      label: "Resolve Remote",
      type: "boolean",
      default: true,
      hint: "Lets the instance fetch an unseen remote account or post. Off restricts the search " +
        "to what it already holds.",
    },
    {
      key: "accountId",
      label: "From Account",
      type: "string",
      default: "",
      advanced: true,
    },
    limitParam(20),
  ],
  output: [
    { key: "statuses", type: "array", label: "Matching statuses" },
    { key: "accounts", type: "array", label: "Matching accounts" },
    { key: "hashtags", type: "array", label: "Matching hashtags" },
    { key: "texts", type: "array", label: "The statuses' text, HTML stripped" },
    { key: "count", type: "number", label: "Results in total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    if (!q) throw new Error("`q` is required");

    const result = await new MastodonClient(ctx).request<{
      statuses?: Array<{ content?: string }>;
      accounts?: unknown[];
      hashtags?: unknown[];
    }>("/api/v2/search", {
      query: query({
        q,
        type: p.type,
        resolve: p.resolve === false ? undefined : true,
        account_id: p.accountId,
        limit: Math.min(40, Math.max(1, Number(p.limit ?? 20))),
      }),
    });

    const statuses = result?.statuses ?? [];
    const accounts = result?.accounts ?? [];
    const hashtags = result?.hashtags ?? [];

    // Counts only — the query is the caller's and the results are people's posts.
    ctx.log("info", "searched Mastodon", {
      statuses: statuses.length,
      accounts: accounts.length,
      hashtags: hashtags.length,
    });

    return {
      statuses,
      accounts,
      hashtags,
      texts: statuses.map((status) => stripHtml(status?.content)),
      count: statuses.length + accounts.length + hashtags.length,
    };
  },
};

export default action;

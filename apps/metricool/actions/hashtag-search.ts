import type { ActionDefinition } from "@w6w/types";
import { callList } from "../lib/client.ts";
import { analyticsNetworks, blogId, int, select, str } from "../lib/params.ts";

type Input = { blogId: string; network?: string; q?: string; limit?: number };

/** `GET /v2/analytics/hashtags`. */
const hashtagSearch: ActionDefinition<Input> = {
  key: "hashtag-search",
  type: "search",
  resource: "hashtag",
  title: "Search Popular Hashtags",
  description: "Popular hashtags, optionally for one network and matching a search term.",
  params: [
    blogId,
    select("network", "Network", analyticsNetworks),
    str("q", "Search term"),
    int("limit", "Limit", { hint: "Maximum number of hashtags." }),
  ],
  output: [
    { key: "items", type: "array", label: "Hashtags: {name, postsCount}" },
    { key: "count", type: "number", label: "Number of hashtags" },
  ],

  execute(input, ctx) {
    return callList(ctx, "/v2/analytics/hashtags", {
      blogId: input.blogId,
      query: { network: input.network, q: input.q, limit: input.limit },
    });
  },
};

export default hashtagSearch;

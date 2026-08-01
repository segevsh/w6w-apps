import type { ActionDefinition } from "@w6w/types";
import { listingItems, RedditClient } from "../lib/client.ts";
import type { RedditListing } from "../lib/client.ts";

interface Input {
  subreddit: string;
  sort: "hot" | "new" | "rising" | "top" | "controversial";
  time?: string;
  limit?: number;
  after?: string;
}

interface Output {
  posts: Record<string, unknown>[];
  after: string | null;
}

/**
 * `GET /r/<subreddit>/<sort>.json` (scope: read) — the sort-specific
 * listing endpoints documented at github.com/reddit-archive/reddit/wiki/API
 * (`GET_hot`, `GET_new`, `GET_rising`, `GET_{sort}`), ported from n8n's
 * `Reddit.node.ts` (`post: getAll`). `after` is Reddit's own pagination
 * cursor — pass the previous call's `after` back in to get the next page.
 */
const postList: ActionDefinition<Input, Output> = {
  key: "post-list",
  type: "search",
  resource: "post",
  title: "List Subreddit Posts",
  description: "List posts from a subreddit, sorted by hot, new, rising, top, or controversial.",
  params: [
    { key: "subreddit", label: "Subreddit", type: "string", required: true, placeholder: "test" },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      default: "hot",
      options: [
        { value: "hot", label: "Hot" },
        { value: "new", label: "New" },
        { value: "rising", label: "Rising" },
        { value: "top", label: "Top" },
        { value: "controversial", label: "Controversial" },
      ],
    },
    {
      key: "time",
      label: "Time window",
      type: "select",
      advanced: true,
      hint: "Only applies to Top and Controversial.",
      options: [
        { value: "hour", label: "Past hour" },
        { value: "day", label: "Past 24 hours" },
        { value: "week", label: "Past week" },
        { value: "month", label: "Past month" },
        { value: "year", label: "Past year" },
        { value: "all", label: "All time" },
      ],
      showIf: { "in": [{ var: "sort" }, ["top", "controversial"]] },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100 },
    },
    { key: "after", label: "After (pagination cursor)", type: "string", advanced: true },
  ],
  output: [{ key: "posts", type: "array", label: "Posts" }, {
    key: "after",
    type: "string",
    label: "Next page cursor",
  }],

  async execute(input, ctx) {
    const listing = await new RedditClient(ctx).request<RedditListing>(
      `/r/${input.subreddit}/${input.sort}.json`,
      {
        query: {
          limit: input.limit ?? 25,
          after: input.after,
          t: (input.sort === "top" || input.sort === "controversial") ? input.time : undefined,
        },
      },
    );
    return { posts: listingItems(listing), after: listing.data.after };
  },
};

export default postList;

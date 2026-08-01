import type { ActionDefinition } from "@w6w/types";
import { listingItems, RedditClient } from "../lib/client.ts";
import type { RedditListing } from "../lib/client.ts";

interface Input {
  query: string;
  subreddit?: string;
  sort?: "relevance" | "hot" | "top" | "new" | "comments";
  limit?: number;
  after?: string;
}

interface Output {
  posts: Record<string, unknown>[];
  after: string | null;
}

/**
 * `GET /search.json` or `GET /r/<subreddit>/search.json` (scope: read) —
 * github.com/reddit-archive/reddit/wiki/API#GET_search, ported from n8n's
 * `Reddit.node.ts` (`post: search`). Omitting Subreddit searches all of
 * Reddit; supplying it searches within that subreddit and sets
 * `restrict_sr=true` so the query doesn't leak outside it.
 */
const postSearch: ActionDefinition<Input, Output> = {
  key: "post-search",
  type: "search",
  resource: "post",
  title: "Search Posts",
  description: "Search for posts across Reddit, or within a single subreddit.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "subreddit",
      label: "Subreddit",
      type: "string",
      hint: "Leave empty to search all of Reddit.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      default: "relevance",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "hot", label: "Hot" },
        { value: "top", label: "Top" },
        { value: "new", label: "New" },
        { value: "comments", label: "Comment count" },
      ],
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
    const path = input.subreddit ? `/r/${input.subreddit}/search.json` : "/search.json";
    const listing = await new RedditClient(ctx).request<RedditListing>(path, {
      query: {
        q: input.query,
        sort: input.sort ?? "relevance",
        limit: input.limit ?? 25,
        after: input.after,
        restrict_sr: input.subreddit ? true : undefined,
      },
    });
    return { posts: listingItems(listing), after: listing.data.after };
  },
};

export default postSearch;

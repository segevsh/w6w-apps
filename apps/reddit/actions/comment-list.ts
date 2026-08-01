import type { ActionDefinition } from "@w6w/types";
import { listingItems, RedditClient } from "../lib/client.ts";
import type { RedditListing } from "../lib/client.ts";

interface Input {
  subreddit: string;
  postId: string;
  sort?: "confidence" | "top" | "new" | "controversial" | "old" | "qa";
  limit?: number;
}

/**
 * `GET /r/<subreddit>/comments/<postId>.json` (scope: read) —
 * github.com/reddit-archive/reddit/wiki/API, ported from n8n's
 * `Reddit.node.ts` (`postComment: getAll`). The endpoint returns a 2-element
 * array of Listings — `[0]` is the post itself, `[1]` is the top-level
 * comment tree — this action returns only the comments half; use
 * `post-get` for the post.
 *
 * Only **top-level** comments are returned. Each comment's `replies` field
 * (when present) is itself a nested Listing of child comments — walking that
 * recursively is a meaningfully bigger surface (Reddit's `more` /
 * `MoreChildren` continuation objects for deeply-nested threads) and is left
 * out here, same scope decision as this pack's other listing actions.
 */
const commentList: ActionDefinition<Input, { comments: Record<string, unknown>[] }> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "Get Post Comments",
  description: "List the top-level comments on a post.",
  params: [
    { key: "subreddit", label: "Subreddit", type: "string", required: true, placeholder: "test" },
    {
      key: "postId",
      label: "Post ID",
      type: "string",
      required: true,
      placeholder: "l0me7x",
      hint: "The id from the post URL, without the t3_ prefix.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [
        { value: "confidence", label: "Best" },
        { value: "top", label: "Top" },
        { value: "new", label: "New" },
        { value: "controversial", label: "Controversial" },
        { value: "old", label: "Old" },
        { value: "qa", label: "Q&A" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { min: 1, max: 500 },
    },
  ],
  output: [{ key: "comments", type: "array", label: "Comments" }],

  async execute(input, ctx) {
    const [, commentsListing] = await new RedditClient(ctx).request<
      [RedditListing, RedditListing]
    >(`/r/${input.subreddit}/comments/${input.postId}.json`, {
      query: { sort: input.sort, limit: input.limit ?? 100 },
    });
    return { comments: listingItems(commentsListing) };
  },
};

export default commentList;

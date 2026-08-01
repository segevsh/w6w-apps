import type { ActionDefinition } from "@w6w/types";
import { fullname, listingItems, RedditClient } from "../lib/client.ts";
import type { RedditListing } from "../lib/client.ts";

interface Input {
  postId: string;
}

/**
 * `GET /api/info?id=t3_<id>` (scope: read) —
 * github.com/reddit-archive/reddit/wiki/API#GET_api_info. Looking a post up
 * by fullname needs no subreddit context, unlike n8n's `post: get` (which
 * goes through `/r/{subreddit}/comments/{postId}.json` and only reads the
 * post half of that response) — `/api/info` is the narrower, purpose-built
 * endpoint for "fetch this one thing by id".
 */
const postGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Look up a single post by ID.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "string",
      required: true,
      placeholder: "l0me7x",
      hint:
        "The id from the post URL (/r/<subreddit>/comments/<postId>/...), with or without the t3_ prefix.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "author", type: "string", label: "Author" },
    { key: "subreddit", type: "string", label: "Subreddit" },
    { key: "permalink", type: "string", label: "Permalink" },
  ],

  async execute(input, ctx) {
    const listing = await new RedditClient(ctx).request<RedditListing>("/api/info", {
      query: { id: fullname("t3", input.postId) },
    });
    const [post] = listingItems(listing);
    if (!post) throw new Error(`post-get: no post found for id ${input.postId}`);
    return post;
  },
};

export default postGet;

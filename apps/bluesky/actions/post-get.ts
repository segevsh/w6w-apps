import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, csv, postUri } from "../lib/client.ts";

/**
 * `app.bsky.feed.getPosts` — hydrate posts by URI, up to 25 at a time.
 *
 * ## Missing is not an error
 *
 * Ask for five and get three: the deleted, blocked and takendown ones are
 * simply absent, in a `200`. Reading `posts[i]` positionally therefore pairs
 * the wrong post with the wrong URI as soon as one goes missing, which is a
 * quiet, plausible-looking corruption. This action reports which URIs did not
 * come back.
 *
 * ## The counts are a snapshot from the AppView
 *
 * `likeCount`, `repostCount` and `replyCount` are aggregates the AppView
 * computed, not values in the post record. They lag, and for a fresh post they
 * are usually zero regardless of reality.
 */
const action: ActionDefinition = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get posts",
  description:
    "Fetch posts by URI, up to 25. Deleted or blocked posts are ABSENT rather than null, so the " +
    "URIs that did not come back are reported.",
  params: [
    {
      key: "uris",
      label: "Posts",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated AT-URIs or bsky.app links, up to 25.",
    },
  ],
  output: [
    { key: "posts", type: "array", label: "The posts that exist" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "missing", type: "array", label: "URIs that did not — deleted, blocked or taken down" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = csv(p.uris);
    if (!raw || raw.length === 0) throw new Error("`uris` is required");
    if (raw.length > 25) {
      throw new Error(`getPosts takes at most 25 URIs at a time — got ${raw.length}`);
    }
    const uris = raw.map((u, i) => postUri(u, `uris[${i}]`).uri);

    const result = await new BlueskyClient(ctx).call<{ posts?: Array<{ uri?: string }> }>(
      "app.bsky.feed.getPosts",
      { query: { uris: uris.join(",") } },
    );

    const posts = result?.posts ?? [];
    const returned = new Set(posts.map((post) => String(post?.uri ?? "")));
    const missing = uris.filter((uri) => !returned.has(uri));

    ctx.log("info", "read Bluesky posts", { asked: uris.length, count: posts.length });
    return { posts, count: posts.length, missing };
  },
};

export default action;

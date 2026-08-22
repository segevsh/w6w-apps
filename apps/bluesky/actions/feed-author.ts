import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { actorParam, CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.feed.getAuthorFeed` — one account's posts.
 *
 * ## `filter` decides what "their posts" means, and the default includes replies
 *
 * `posts_with_replies` is the API default: every reply they have made to anyone
 * shows up, which for a chatty account is most of the feed and is rarely what a
 * workflow watching an account for announcements wants. The options are
 * `posts_no_replies`, `posts_with_media`, `posts_and_author_threads`, and
 * `posts_with_video`.
 *
 * This action defaults to **`posts_no_replies`**, because "watch this account
 * for new posts" is the overwhelmingly common intent and the API's default
 * answers a different question.
 *
 * ## Reposts arrive as posts by someone else
 *
 * A feed item is `{post, reason?}`, and when the account reposted something the
 * `post` belongs to the original author with `reason` set to
 * `#reasonRepost`. Reading `post.author.handle` and assuming it is the account
 * you asked about is wrong for every repost. `includeReposts` off filters them,
 * and the counts distinguish them either way.
 */
const action: ActionDefinition = {
  key: "feed-author",
  type: "read",
  resource: "feed",
  title: "Get an account's posts",
  description:
    "One account's feed. Defaults to excluding replies, unlike the API — and reposts arrive as " +
    "posts by their ORIGINAL author, which is easy to misread.",
  params: [
    actorParam("Account", "A handle or a DID."),
    {
      key: "filter",
      label: "Include",
      type: "select",
      default: "posts_no_replies",
      options: [
        { value: "posts_no_replies", label: "Posts only — no replies" },
        { value: "posts_with_replies", label: "Posts and replies (the API's own default)" },
        { value: "posts_and_author_threads", label: "Posts and their own threads" },
        { value: "posts_with_media", label: "Posts with media" },
        { value: "posts_with_video", label: "Posts with video" },
      ],
    },
    {
      key: "includeReposts",
      label: "Include Reposts",
      type: "boolean",
      default: true,
      hint: "Off drops items the account reposted rather than wrote.",
    },
    limitParam(50),
    CURSOR_PARAM,
  ],
  output: [
    { key: "feed", type: "array", label: "Feed items, each `{post, reason?}`" },
    { key: "posts", type: "array", label: "Just the posts" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "repostCount", type: "number", label: "How many were reposts, not original posts" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const actor = String(p.actor ?? "").trim().replace(/^@/, "");
    if (!actor) throw new Error("`actor` is required");

    const result = await new BlueskyClient(ctx).call<{
      feed?: Array<{ post?: unknown; reason?: { $type?: string } }>;
      cursor?: string;
    }>("app.bsky.feed.getAuthorFeed", {
      query: query({
        actor,
        filter: p.filter ?? "posts_no_replies",
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    let feed = result?.feed ?? [];
    const isRepost = (item: { reason?: { $type?: string } }) =>
      String(item?.reason?.$type ?? "").endsWith("#reasonRepost");
    const repostCount = feed.filter(isRepost).length;
    if (p.includeReposts === false) feed = feed.filter((item) => !isRepost(item));

    ctx.log("info", "read a Bluesky author feed", { count: feed.length, reposts: repostCount });
    return {
      feed,
      posts: feed.map((item) => item?.post).filter(Boolean),
      count: feed.length,
      repostCount,
      cursor: result?.cursor,
    };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.feed.getTimeline` — the connected account's own following feed.
 *
 * ## The cursor is the only reliable way to page, and it is not a timestamp
 *
 * A timeline is being written to constantly. Paging by offset would repeat and
 * skip posts; the opaque cursor is what makes a walk consistent. For "what is
 * new since last run", keep the **URI of the newest post you processed** and
 * stop when you see it again — the cursor from a previous run points into a
 * feed that has since shifted.
 */
const action: ActionDefinition = {
  key: "feed-timeline",
  type: "read",
  resource: "feed",
  title: "Get the timeline",
  description:
    "The connected account's following feed. For 'what is new', remember the newest post's URI " +
    "and stop when you reach it — a cursor from a previous run points into a shifted feed.",
  params: [limitParam(50), CURSOR_PARAM],
  output: [
    { key: "feed", type: "array", label: "Feed items" },
    { key: "posts", type: "array", label: "Just the posts" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const result = await new BlueskyClient(ctx).call<{
      feed?: Array<{ post?: unknown }>;
      cursor?: string;
    }>("app.bsky.feed.getTimeline", {
      query: query({
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    const feed = result?.feed ?? [];
    ctx.log("info", "read the Bluesky timeline", { count: feed.length });
    return {
      feed,
      posts: feed.map((item) => item?.post).filter(Boolean),
      count: feed.length,
      cursor: result?.cursor,
    };
  },
};

export default action;

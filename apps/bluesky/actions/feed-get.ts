import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, parseAtUri, query } from "../lib/client.ts";
import { CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.feed.getFeed` — read a custom feed generator.
 *
 * ## Feeds are third-party services, and it shows
 *
 * A feed generator is somebody else's server, addressed by an AT-URI in the
 * `app.bsky.feed.generator` collection. Bluesky's AppView asks it for a list of
 * post URIs and hydrates them. That means a feed can be **slow, empty, or
 * offline** for reasons entirely outside Bluesky, and its output can change
 * without notice because it is somebody's algorithm.
 *
 * The practical consequence: an empty page from a feed is not evidence the feed
 * is finished, and a workflow that treats "no items" as "done" will stop early
 * on a generator having a bad minute.
 */
const action: ActionDefinition = {
  key: "feed-get",
  type: "read",
  resource: "feed",
  title: "Read a custom feed",
  description:
    "Read a feed generator. These are third-party services — an empty page can mean the " +
    "generator is having trouble rather than that the feed has ended.",
  params: [
    {
      key: "feed",
      label: "Feed",
      type: "string",
      required: true,
      default: "",
      hint: "The generator's AT-URI, e.g. `at://did:plc:.../app.bsky.feed.generator/whats-hot`.",
    },
    limitParam(50),
    CURSOR_PARAM,
  ],
  output: [
    { key: "feed", type: "array", label: "Feed items" },
    { key: "posts", type: "array", label: "Just the posts" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const parsed = parseAtUri(p.feed, "feed");
    if (parsed.collection !== "app.bsky.feed.generator") {
      throw new Error(
        `that URI is a ${parsed.collection} record, not a feed generator — a feed's URI is in ` +
          "the `app.bsky.feed.generator` collection",
      );
    }

    const result = await new BlueskyClient(ctx).call<{
      feed?: Array<{ post?: unknown }>;
      cursor?: string;
    }>("app.bsky.feed.getFeed", {
      query: query({
        feed: `at://${parsed.did}/${parsed.collection}/${parsed.rkey}`,
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    const feed = result?.feed ?? [];
    ctx.log("info", "read a Bluesky custom feed", { count: feed.length });
    return {
      feed,
      posts: feed.map((item) => item?.post).filter(Boolean),
      count: feed.length,
      cursor: result?.cursor,
    };
  },
};

export default action;

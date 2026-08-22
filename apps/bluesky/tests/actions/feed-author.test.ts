import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/feed-author.ts";

const mixed = ok({
  feed: [
    {
      post: {
        uri: "at://did:plc:alice/app.bsky.feed.post/1",
        author: { handle: "alice.bsky.social" },
      },
    },
    {
      post: {
        uri: "at://did:plc:other/app.bsky.feed.post/2",
        author: { handle: "other.bsky.social" },
      },
      reason: { $type: "app.bsky.feed.defs#reasonRepost" },
    },
  ],
  cursor: "c1",
});

/**
 * The API defaults to `posts_with_replies`, which for a chatty account is
 * mostly replies — rarely what "watch this account" means.
 */
Deno.test("feed-author: excludes replies by default, against the API's own default", async () => {
  const { ctx, calls } = mockCtx([mixed], { display });
  await action.execute!({ actor: "alice.bsky.social" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "posts_no_replies");
});

/** A repost's `post` belongs to the original author, not the account asked about. */
Deno.test("feed-author: reposts are counted, and can be filtered out", async () => {
  const kept = mockCtx([mixed], { display });
  const withReposts = await action.execute!({ actor: "alice.bsky.social" }, kept.ctx) as {
    count: number;
    repostCount: number;
  };
  assertEquals(withReposts.count, 2);
  assertEquals(withReposts.repostCount, 1);

  const dropped = mockCtx([mixed], { display });
  const without = await action.execute!({
    actor: "alice.bsky.social",
    includeReposts: false,
  }, dropped.ctx) as { count: number; repostCount: number };
  assertEquals(without.count, 1);
  assertEquals(without.repostCount, 1, "still reported, so the filtering is visible");
});

Deno.test("feed-author: the filter can be set back to the API's default", async () => {
  const { ctx, calls } = mockCtx([mixed], { display });
  await action.execute!({ actor: "alice.bsky.social", filter: "posts_with_replies" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "posts_with_replies");
});

Deno.test("feed-author: posts are lifted out of the feed wrapper", async () => {
  const { ctx } = mockCtx([mixed], { display });
  const result = await action.execute!({ actor: "alice.bsky.social" }, ctx) as {
    posts: Array<{ uri: string }>;
  };
  assertEquals(result.posts.length, 2);
  assertEquals(result.posts[0].uri, "at://did:plc:alice/app.bsky.feed.post/1");
});

Deno.test("feed-author: a leading @ is stripped and the limit clamped", async () => {
  const { ctx, calls } = mockCtx([mixed], { display });
  await action.execute!({ actor: "@alice.bsky.social", limit: 500 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("actor"), "alice.bsky.social");
  assertEquals(url.searchParams.get("limit"), "100");
});

Deno.test("feed-author: needs an account", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`actor` is required");
});

Deno.test("feed-author: logs counts, never the posts", async () => {
  const { ctx, logs } = mockCtx([mixed], { display });
  await action.execute!({ actor: "alice.bsky.social" }, ctx);
  assertEquals(logs[0].data, { count: 2, reposts: 1 });
});

Deno.test("feed-author: says reposts arrive under their original author", () => {
  assert(/ORIGINAL author/.test(action.description!), action.description);
});

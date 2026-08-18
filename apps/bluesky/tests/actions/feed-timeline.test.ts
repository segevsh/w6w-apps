import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/feed-timeline.ts";

const page = ok({
  feed: [{ post: { uri: "at://a/app.bsky.feed.post/1" } }, {
    post: { uri: "at://b/app.bsky.feed.post/2" },
  }],
  cursor: "c1",
});

Deno.test("feed-timeline: reads the connected account's own following feed", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  const result = await action.execute!({}, ctx) as { count: number; cursor: string };
  assert(calls[0].url.includes("app.bsky.feed.getTimeline"), calls[0].url);
  assertEquals(result.count, 2);
  assertEquals(result.cursor, "c1");
});

Deno.test("feed-timeline: posts are lifted out of the wrapper", async () => {
  const { ctx } = mockCtx([page], { display });
  const result = await action.execute!({}, ctx) as { posts: unknown[] };
  assertEquals(result.posts.length, 2);
});

Deno.test("feed-timeline: the limit is clamped and the cursor passed", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  await action.execute!({ limit: 999, cursor: "c0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("cursor"), "c0");
});

Deno.test("feed-timeline: an empty timeline is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ feed: [] })], { display });
  const result = await action.execute!({}, ctx) as { count: number; cursor?: string };
  assertEquals(result.count, 0);
  assertEquals(result.cursor, undefined);
});

Deno.test("feed-timeline: logs a count, never the posts", async () => {
  const { ctx, logs } = mockCtx([page], { display });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 2 });
});

/** A cursor from a previous run points into a feed that has since shifted. */
Deno.test("feed-timeline: says how to do 'what is new since last run'", () => {
  assert(/newest post's URI/.test(action.description!), action.description);
});

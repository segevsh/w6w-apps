import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/feed-get.ts";

const FEED = "at://did:plc:gen/app.bsky.feed.generator/whats-hot";
const page = ok({ feed: [{ post: { uri: "at://a/app.bsky.feed.post/1" } }], cursor: "c1" });

test("feed-get: reads a generator by its AT-URI", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  const result = await action.execute!({ feed: FEED }, ctx) as { count: number };
  const url = new URL(calls[0].url);
  assert(url.pathname.endsWith("app.bsky.feed.getFeed"), url.pathname);
  assertEquals(url.searchParams.get("feed"), FEED);
  assertEquals(result.count, 1);
});

/** A post URI in the feed slot would otherwise fail deep inside the AppView. */
test("feed-get: a URI from the wrong collection is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ feed: "at://did:plc:a/app.bsky.feed.post/1" }, ctx),
    Error,
  );
  assert(/app.bsky.feed.generator/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

test("feed-get: the limit is clamped and the cursor passed", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  await action.execute!({ feed: FEED, limit: 999, cursor: "c0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("cursor"), "c0");
});

/** An empty page can mean the generator is unwell, not that the feed ended. */
test("feed-get: an empty page is returned as-is, and the docs say why", async () => {
  const { ctx } = mockCtx([ok({ feed: [] })], { display });
  const result = await action.execute!({ feed: FEED }, ctx) as { count: number };
  assertEquals(result.count, 0);
  assert(/having trouble/.test(action.description!), action.description);
});

test("feed-get: needs a feed", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`feed` is required");
});

test("feed-get: logs a count", async () => {
  const { ctx, logs } = mockCtx([page], { display });
  await action.execute!({ feed: FEED }, ctx);
  assertEquals(logs[0].data, { count: 1 });
});

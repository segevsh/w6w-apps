import { assertEquals, assertRejects } from "@std/assert";
import contents from "../../actions/stream-contents.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

const page = {
  id: "user/-/state/com.google/reading-list",
  title: "Reading",
  updated: 1,
  items: [{ id: "tag:google.com,2005:reader/item/0000000693c3bc0c" }],
  continuation: "gmMZ",
};

Deno.test("stream-contents: encodes the stream id into the path and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await contents.execute(
    { streamId: "feed/http://feeds.arstechnica.com/a" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/reader/api/0/stream/contents/feed%2Fhttp%3A%2F%2Ffeeds.arstechnica.com%2Fa",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.continuation, "gmMZ");
  assertEquals(out.items, page.items);
  assertEquals(out.title, "Reading");
});

Deno.test("stream-contents: maps every option to the documented query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await contents.execute({
    streamId: "user/-/label/Tech",
    count: 50,
    order: "oldest",
    newerThan: 1700000000,
    excludeRead: true,
    onlyLabel: "starred",
    continuation: " abc ",
    onlyManualTags: true,
    annotations: true,
    summaries: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    n: "50",
    r: "o",
    ot: "1700000000",
    xt: "user/-/state/com.google/read",
    it: "user/-/state/com.google/starred",
    c: "abc",
    includeAllDirectStreamIds: "false",
    annotations: "1",
    summaries: "1",
  });
});

Deno.test("stream-contents: liked filter, newest order sends no r; missing items is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await contents.execute(
    { streamId: "s", order: "newest", onlyLabel: "like" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(queryOf(calls[0].url), { it: "user/-/state/com.google/like" });
  assertEquals(out.items, []);
});

Deno.test("stream-contents: requires a stream id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await contents.execute({ streamId: "" }, ctx), Error, "streamId");
});

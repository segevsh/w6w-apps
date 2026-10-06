import { assertEquals, assertRejects } from "@std/assert";
import add from "../../actions/subscription-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const reply = {
  query: "feed/http://feeds.arstechnica.com/arstechnica/science",
  numResults: 1,
  streamId: "feed/http://arstechnica.com/",
  streamName: "Ars Technica » Scientific Method",
};

Deno.test("subscription-add: POSTs quickadd and returns the JSON reply", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await add.execute({ feed: reply.query }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/subscription/quickadd");
  assertEquals(queryOf(calls[0].url), { quickadd: reply.query });
  assertEquals(out, reply);
});

Deno.test("subscription-add: a bare URL is prefixed with feed/", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  await add.execute({ feed: "http://example.com/rss" }, ctx);
  assertEquals(queryOf(calls[0].url).quickadd, "feed/http://example.com/rss");
});

Deno.test("subscription-add: numResults 0 is an error, not a success", async () => {
  const { ctx } = mockCtx([{ body: { ...reply, numResults: 0 } }]);
  await assertRejects(async () => await add.execute({ feed: "feed/x" }, ctx), Error, "did not add");
});

Deno.test("subscription-add: empty feed is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await add.execute({ feed: "  " }, ctx),
    Error,
    "feed is required",
  );
  assertEquals(calls.length, 0);
});

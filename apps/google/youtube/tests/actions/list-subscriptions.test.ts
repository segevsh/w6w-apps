import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subscriptions.ts";

Deno.test("list-subscriptions: hits /youtube/v3/subscriptions with part and mine", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: "snippet", mine: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/subscriptions");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(url.searchParams.get("mine"), "true");
});

Deno.test("list-subscriptions: mine and mySubscribers are opposite directions", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "subscriberSnippet", mySubscribers: true }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("mySubscribers"), "true");
  assertEquals(p.get("mine"), null);
});

Deno.test("list-subscriptions: forChannelId is a filter, not a selector", async () => {
  // Combined with mine=true this answers "am I subscribed?" for one unit.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", mine: true, forChannelId: "UC1" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("mine"), "true");
  assertEquals(p.get("forChannelId"), "UC1");
});

Deno.test("list-subscriptions: rejects zero or several selectors", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of",
  );
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", mine: true, channelId: "UC1" }, ctx);
    },
    Error,
    "exactly one of",
  );
  // forChannelId alone is not a selector.
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", forChannelId: "UC1" }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-subscriptions: forwards paging and ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "snippet",
    channelId: "UC1",
    maxResults: 50,
    pageToken: "t",
    order: "alphabetical",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "t");
  assertEquals(p.get("order"), "alphabetical");
});

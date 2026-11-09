import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-tweet.ts";

test("new-tweet seeds, emits new tweets, retries idempotently, and requests recency", async () => {
  const seed = mockCtx([{ body: { data: [{ id: "1" }] } }]);
  const baseline = await trigger.poll!({ params: { query: "w6w" }, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.x.com/2/tweets/search/recent?query=w6w&max_results=100&sort_order=recency",
  );
  const a = mockCtx([{ body: { data: [{ id: "2" }, { id: "1" }] } }]);
  const b = mockCtx([{ body: { data: [{ id: "2" }, { id: "1" }] } }]);
  const one = await trigger.poll!({ params: { query: "w6w" }, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: { query: "w6w" }, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: "2" }]);
  assertEquals(one, retry);
});

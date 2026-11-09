import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

test("new-lead seeds, emits leads, retries idempotently, and requests descending order", async () => {
  const seed = mockCtx([{ body: { leads: [{ id: "1" }] } }]);
  const baseline = await trigger.poll!({ params: { pageId: "p1" }, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.unbounce.com/pages/p1/leads?sort_order=desc&limit=100",
  );
  const a = mockCtx([{ body: { leads: [{ id: "2" }, { id: "1" }] } }]);
  const b = mockCtx([{ body: { leads: [{ id: "2" }, { id: "1" }] } }]);
  const one = await trigger.poll!({ params: { pageId: "p1" }, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: { pageId: "p1" }, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: "2" }]);
  assertEquals(one, retry);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-call.ts";
const page = (calls: unknown[]) => ({ meta: { total: calls.length, next_page_link: null }, calls });
test("new-call seeds, emits, retries, and requests descending calls", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.aircall.io/v1/calls?order=desc&page=1&per_page=50");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});

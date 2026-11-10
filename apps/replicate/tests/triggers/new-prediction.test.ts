import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-prediction.ts";

const item = (id: string) => ({ id });
test("new-prediction seeds, emits new predictions, retries, and calls the documented list", async () => {
  const seed = mockCtx([{ body: { results: [item("a")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.replicate.com/v1/predictions");
  const response = { results: [item("b"), item("a")] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

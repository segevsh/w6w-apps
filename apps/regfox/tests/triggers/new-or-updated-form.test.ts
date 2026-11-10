import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-form.ts";
const item = (id: number, dateUpdated: string) => ({ id, dateUpdated });
test("new-or-updated-form seeds, emits edited keys, retries, and requests descending forms", async () => {
  const seed = mockCtx([{ body: { data: [item(1, "a")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.webconnex.com/v2/public/forms?sort=desc&limit=50");
  const body = { data: [item(1, "b"), item(1, "a")] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [item(1, "b")]);
  assertEquals(retry, first);
});

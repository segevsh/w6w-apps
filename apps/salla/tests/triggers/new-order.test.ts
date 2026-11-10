import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-order.ts";
const item = (id: number) => ({ id });
test("new-order seeds, emits, retries, and requests literal created ordering", async () => {
  const seed = mockCtx([{ body: { data: [item(1)] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.salla.dev/admin/v2/orders?sort_by=created_at-desc&page=1&per_page=60",
  );
  const response = { data: [item(2), item(1)] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});

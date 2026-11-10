import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-order.ts";
const item = (id: number) => ({ id });
test("new-order seeds, emits, retries, and requests the literal created-since page", async () => {
  clock.now = () => 1_794_182_400_000;
  const seed = mockCtx([{ body: { data: [item(1)] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.samcart.com/v1/orders?created_at_min=1970-01-01T00%3A00%3A00Z&limit=100",
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

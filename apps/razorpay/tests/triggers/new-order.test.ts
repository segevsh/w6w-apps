import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-order.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-order: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ items: [{ id: "a" }], count: 1 });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.razorpay.com/v1/orders?from=0&to=4102444800&count=100&skip=0",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ id: "b" }, { id: "a" }], count: 2 }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ id: "b" }, { id: "a" }], count: 2 }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

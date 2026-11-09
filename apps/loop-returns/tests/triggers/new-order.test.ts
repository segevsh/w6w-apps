import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-order.ts";
import { mockCtx } from "../_helpers.ts";

test("new-order seeds, emits, retries, and requests the newest page", async () => {
  const seed = mockCtx([{ body: { orders: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ state: {}, params: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.loopreturns.com/api/v1/orders?limit=100&sort_order=desc",
  );
  const responses = [{ body: { orders: [{ id: "new" }, { id: "old" }] } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(retry, first);
});

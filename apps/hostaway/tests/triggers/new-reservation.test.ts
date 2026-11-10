import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-reservation.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-reservation seeds, emits unseen reservations idempotently, and requests newest-first reservations", async () => {
  const seedCtx = mockCtx([envelope([{ id: "old" }])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.hostaway.com/v1/reservations?limit=100&offset=0&sortOrder=latestActivityDesc",
  );
  const response = envelope([{ id: "new" }, { id: "old" }]);
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-sms.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-sms seeds, emits unseen messages idempotently, and requests newest-first SMS history", async () => {
  const seedCtx = mockCtx([{ body: { smses: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.transmitmessage.com/v2/sms?limit=100&page=1&order_by=CREATED_AT_DESC&format=JSON",
  );
  const response = { body: { smses: [{ id: "new" }, { id: "old" }] } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-email.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-email seeds, emits unseen emails idempotently, and requests newest-first emails", async () => {
  const seedCtx = mockCtx([{ body: { items: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.instantly.ai/api/v2/emails?sort_order=desc&limit=100",
  );
  const response = { body: { items: [{ id: "new" }, { id: "old" }] } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

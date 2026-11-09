import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-campaign.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-campaign seeds, emits unseen campaigns idempotently, and requests newest-first campaigns", async () => {
  const seedCtx = mockCtx([{ body: { campaigns: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.iterable.com/api/campaigns?page=1&pageSize=100&sort=-createdAt",
  );
  const response = { body: { campaigns: [{ id: "new" }, { id: "old" }] } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

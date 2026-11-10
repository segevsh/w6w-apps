import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deal.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-deal seeds, emits unseen deals idempotently, and requests newest-first deals", async () => {
  const seedCtx = mockCtx([{ body: { data: { deals: [{ id: "old" }] } } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://public.api.iclosed.io/v1/deals?limit=100&page=0&orderBy=desc&orderColumn=time",
  );
  const response = { body: { data: { deals: [{ id: "new" }, { id: "old" }] } } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

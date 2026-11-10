import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-card.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-card seeds, emits unseen cards idempotently, and requests newest-first cards", async () => {
  const seedCtx = mockCtx([{ body: [{ id: "old" }] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.getguru.com/api/v1/search/cardmgr?maxResults=50&sortField=dateCreated&sortOrder=DESC",
  );
  const response = { body: [{ id: "new" }, { id: "old" }] };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

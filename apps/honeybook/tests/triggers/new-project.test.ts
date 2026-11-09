import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

const input = { params: {}, subscriptionId: "sub_1" };

test("new-project seeds, emits unseen projects idempotently, and requests newest-first projects", async () => {
  const seedCtx = mockCtx([{ body: { data: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://api.honeybook.com/api/v3/projects?page=1&per_page=100&sort=-created_at",
  );
  const response = { body: { data: [{ id: "new" }, { id: "old" }] } };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response]).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});

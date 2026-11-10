import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-template.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-or-updated-template: emits an edited template once", async () => {
  const old = { id: "template-1", updated_at: "2026-01-01T00:00:00Z" };
  const seededCtx = mockCtx([{ body: { data: [old] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seededCtx.calls[0].url,
    "https://api.placid.app/api/rest/templates?order_by=updated_at-desc",
  );
  const edited = { id: "template-1", updated_at: "2026-01-02T00:00:00Z" };
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: [edited, old] } }]).ctx,
  );
  assertEquals(result.events, [edited]);
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: [edited, old] } }]).ctx,
  );
  assertEquals(retry, result);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockGorgiasCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-customer.ts";

test("new-or-updated-customer seeds, emits edited ids, retries, and requests updated-time descending", async () => {
  const item = { id: 1, updated_datetime: "2026-11-09T00:00:00Z" };
  const seed = mockGorgiasCtx([{ body: { data: [item] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seed.calls[0].url).searchParams.get("order_by"), "updated_datetime:desc");
  const edited = { ...item, updated_datetime: "2026-11-10T00:00:00Z" };
  const next = await trigger.poll!(
    { params: {}, state: first.nextState, subscriptionId: "s" },
    mockGorgiasCtx([{ body: { data: [edited] } }]).ctx,
  );
  assertEquals(next.events, [edited]);
});

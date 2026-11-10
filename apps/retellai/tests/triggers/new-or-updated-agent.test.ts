import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-agent.ts";
const item = (agent_id: string, user_modified_timestamp: number) => ({
  agent_id,
  user_modified_timestamp,
});
test("new-or-updated-agent seeds, emits edits, retries, and requests descending agents", async () => {
  const seed = mockCtx([{ body: { items: [item("a", 1)] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(
    seed.calls[0].url,
    "https://api.retellai.com/v2/list-agents?limit=100&sort_order=descending",
  );
  const body = { items: [item("a", 2), item("a", 1)] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [item("a", 2)]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-agent.ts";

const item = (agent_id: string) => ({ agent_id });
test("new-agent seeds, emits new agents, retries, and requests descending agents", async () => {
  const seed = mockCtx([{ body: { items: [item("a")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(
    seed.calls[0].url,
    "https://api.retellai.com/v2/list-agents?limit=100&sort_order=descending",
  );
  const response = { items: [item("b"), item("a")] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: response }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

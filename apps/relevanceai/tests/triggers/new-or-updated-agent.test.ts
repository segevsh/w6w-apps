import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockRelevanceCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-agent.ts";
const item = (agent_id: string, update_date_: string) => ({ agent_id, update_date_ });
test("new-or-updated-agent seeds, emits edited keys, retries, and posts update sorting", async () => {
  const seed = mockRelevanceCtx([{ body: { results: [item("a", "1")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://api-f1db6c.stack.tryrelevance.com/latest/agents/list");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    page: 1,
    page_size: 100,
    sort: [{ update_date_: "desc" }],
  });
  const body = { results: [item("a", "2"), item("a", "1")] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockRelevanceCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockRelevanceCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [item("a", "2")]);
  assertEquals(retry, first);
});

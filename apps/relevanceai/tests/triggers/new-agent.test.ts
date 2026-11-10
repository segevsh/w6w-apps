import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockRelevanceCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-agent.ts";

const item = (agent_id: string) => ({ agent_id });
test("new-agent seeds, emits new agents, retries, and posts a literal newest-first sort", async () => {
  const seed = mockRelevanceCtx([{ body: { results: [item("a")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://api-f1db6c.stack.tryrelevance.com/latest/agents/list");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    page: 1,
    page_size: 100,
    sort: [{ insert_date_: "desc" }],
  });
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockRelevanceCtx([{ body: { results: [item("b"), item("a")] } }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockRelevanceCtx([{ body: { results: [item("b"), item("a")] } }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-node.ts";

const params = { parent_id: "inbox" };
const item = (id: string) => ({
  id,
  parent_id: "inbox",
  name: `Node ${id}`,
  priority: 100,
  completed: false,
});
const res = (ids: string[]) => ({ body: { nodes: ids.map(item) } });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-node: seeds, emits only added items, retries idempotently, literal request", async () => {
  const seeded = await poll({}, [res(["a"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, "https://workflowy.com/api/v1/nodes?parent_id=inbox");
  assertEquals(seeded.calls[0].body, null);
  const first = await poll(seeded.r.nextState, [res(["a", "b"])]);
  const retry = await poll(seeded.r.nextState, [res(["a", "b"])]);
  assertEquals(first.r.events, [item("b")]);
  assertEquals(retry.r, first.r);
});

test("new-node: a removed or edited item is not an event", async () => {
  const seeded = await poll({}, [res(["a", "b"])]);
  const next = await poll(seeded.r.nextState, [
    { body: { nodes: [{ ...item("a"), name: "Renamed" }] } },
  ]);
  assertEquals(next.r.events, []);
});

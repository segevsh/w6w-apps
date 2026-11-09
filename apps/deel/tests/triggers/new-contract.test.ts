import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contract.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const respond = (items: unknown[]) => ({ body: { data: items, page: {} } });
const item = (id: string) => ({ id, title: `t${id}` });
const ctx = (items: unknown[]) => mockCtx([respond(items)]);

test("new-contract: seeds without flooding and sends the documented request", async () => {
  const seed = ctx([item("c1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.letsdeel.com/rest/contracts?order_direction=desc&limit=100",
  );
});

test("new-contract: emits only the new item", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("c1")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("c2"), item("c1")]).ctx,
  );
  assertEquals(result.events, [item("c2")]);
});

test("new-contract: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("c1")]).ctx);
  const page = [item("c2"), item("c1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

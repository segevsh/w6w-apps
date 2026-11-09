import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-checklist.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const respond = (items: unknown[]) => ({ body: items });
const item = (id: number, u = 1) => ({ id, name: `c${id}`, updated_at: u });
const ctx = (items: unknown[]) => mockCtx([respond(items)]);

test("new-or-updated-checklist: seeds without flooding and sends the documented request", async () => {
  const seed = ctx([item(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.companycam.com/v2/checklists?page=1&per_page=50");
});

test("new-or-updated-checklist: emits only the new item", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(2), item(1)]).ctx,
  );
  assertEquals(result.events, [item(2)]);
});

test("new-or-updated-checklist: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const page = [item(2), item(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-or-updated-checklist: an edited record is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item(1, 1)]).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(1, 2)]).ctx,
  );
  assertEquals(edited.events, [item(1, 2)]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(1, 1)]).ctx,
  );
  assertEquals(same.events, []);
});

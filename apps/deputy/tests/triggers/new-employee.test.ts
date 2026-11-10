import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-employee.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const respond = (items: unknown[]) => ({ body: items });
const item = (Id: number, Modified = "2026-11-09T09:00:00+00:00") => ({ Id, Modified });
const ctx = (items: unknown[]) =>
  mockCtx([respond(items)], { display: { baseUrl: "https://acme.au.deputy.com" } });

test("new-employee: seeds without flooding and sends the documented request", async () => {
  const seed = ctx([item(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://acme.au.deputy.com/api/v1/resource/Employee/QUERY");
  assertEquals(JSON.parse(seed.calls[0].body!), { sort: { Id: "desc" }, start: 0, max: 100 });
});

test("new-employee: emits only the new item", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(2), item(1)]).ctx,
  );
  assertEquals(result.events, [item(2)]);
});

test("new-employee: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const page = [item(2), item(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

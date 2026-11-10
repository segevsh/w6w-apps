import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) =>
  mockCtx([{ body: { results: items, pagination: { next_cursor: null } } }]);
const item = (
  id: number,
  v = 0,
) => ({ id: `ct_${id}`, first_name: "A", created_at: `2026-11-09T00:00:0${id}Z` });

test("new-contact: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-contact: emits only the new record after the seed", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(3), item(2), item(1)]).ctx,
  );
  assertEquals(next.events, [item(3)]);
});

test("new-contact: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2)]).ctx);
  const page = [item(3), item(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(3)]);
  assertEquals(again, first);
});

test("new-contact: sends the list request (documented sorted descending by created_at)", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.superchat.com/v1.0/contacts?limit=100",
  );
});

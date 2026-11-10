import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSupabaseCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-row.ts";

const input = {
  params: { table: "todos", createdAtColumn: "created_at" },
  subscriptionId: "sub-1",
};
const ctx = (items: unknown[]) => mockSupabaseCtx([{ body: items }]);
const item = (id: number, _v = 0) => ({ id: `row_${id}`, created_at: `2026-11-09T00:00:0${id}Z` });

test("new-row: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-row: emits only the new record after the seed", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(3), item(2), item(1)]).ctx,
  );
  assertEquals(next.events, [item(3)]);
});

test("new-row: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2)]).ctx);
  const page = [item(3), item(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(3)]);
  assertEquals(again, first);
});

test("new-row: sends the list request (order=created_at.desc.nullslast,id.desc)", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://abcdefgh.supabase.co/rest/v1/todos?select=*&order=created_at.desc.nullslast%2Cid.desc&limit=100&offset=0",
  );
});

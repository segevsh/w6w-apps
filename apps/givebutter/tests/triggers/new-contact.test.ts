import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id, first_name: "Ada", created_at: updated, updated_at: updated });
const body = (
  items: unknown[],
) => ({
  data: items,
  links: {},
  meta: { current_page: 1, last_page: 1, per_page: 100, total: items.length },
});
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);

test("new-contact: seed check emits nothing and records the cursor/ids", async () => {
  const c = ctx([item(1)]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

const seed = () => trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);

test("new-contact: emits only the record that is new", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-contact: the same state and responses give the same result", async () => {
  const state = (await seed()).nextState;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-contact: requests exactly the endpoint the list action calls", async () => {
  const state = (await seed()).nextState;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.givebutter.com/v1/contacts?sortByDesc=created_at&page=1&per_page=100",
  );
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-person.ts";

const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id, name: "Ada", created: updated, updated });
const body = (
  items: unknown[],
) => ({
  _metadata: {
    collection: "people",
    total: items.length,
    limit: 100,
    offset: 0,
    next: null,
    nextLink: null,
  },
  people: items,
});
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);

test("new-or-updated-person: seed check emits nothing and records the cursor/ids", async () => {
  const c = ctx([item(1)]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

const seed = () => trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);

test("new-or-updated-person: emits only the record that is new", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-or-updated-person: the same state and responses give the same result", async () => {
  const state = (await seed()).nextState;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-or-updated-person: requests exactly the endpoint the list action calls", async () => {
  const state = (await seed()).nextState;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, "https://api.followupboss.com/v1/people?limit=100&sort=-updated");
});

test("new-or-updated-person: an edited record is a new event", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(1, "2026-11-09T11:00:00Z")]).ctx);
  assertEquals(r.events, [item(1, "2026-11-09T11:00:00Z")]);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id: `crd_${id}`, name: "Ada", handles: [], updated_at: Date.parse(updated) / 1000 });
const body = (items: unknown[]) => ({ _results: items, _pagination: {} });
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);
const CURSOR = Date.parse("2026-11-09T10:00:00Z");
const seeded = { v: 1, kind: "ids", seeded: true, ids: ["crd_1:1794218400"], cursor: CURSOR };
const realNow = Date.now;

test("new-or-updated-contact: seed check emits nothing and records the cursor/ids", async () => {
  Date.now = () => Date.parse("2026-11-09T12:00:00Z");
  try {
    const c = ctx([item(1)]);
    const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals((r.nextState as { cursor?: number }).cursor, Date.parse("2026-11-09T12:00:00Z"));
  } finally {
    Date.now = realNow;
  }
});

test("new-or-updated-contact: emits only the record that is new", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-or-updated-contact: the same state and responses give the same result", async () => {
  const state = seeded;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-or-updated-contact: requests exactly the endpoint the list action calls", async () => {
  const state = seeded;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api2.frontapp.com/contacts?limit=100&q%5Bupdated_after%5D=1794218280",
  );
});

test("new-or-updated-contact: an edited record is a new event", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(1, "2026-11-09T11:00:00Z")]).ctx);
  assertEquals(r.events, [item(1, "2026-11-09T11:00:00Z")]);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-change.ts";

const params = { q: "status:open" };
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ _number: id, project: "p", subject: "S", status: "NEW", created: updated, updated });
const body = (items: unknown[]) => items;
const ctx = (items: unknown[]) =>
  mockCtx([{ body: body(items) }], { display: { host: "https://gerrit.example.com" } });

test("new-change: seed check emits nothing and records the cursor/ids", async () => {
  const c = ctx([item(1)]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

const seed = () => trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);

test("new-change: emits only the record that is new", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-change: the same state and responses give the same result", async () => {
  const state = (await seed()).nextState;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-change: requests exactly the endpoint the list action calls", async () => {
  const state = (await seed()).nextState;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://gerrit.example.com/a/changes/?q=status%3Aopen&n=100&S=0&o=DETAILED_ACCOUNTS&o=SUBMITTABLE&o=LABELS",
  );
});

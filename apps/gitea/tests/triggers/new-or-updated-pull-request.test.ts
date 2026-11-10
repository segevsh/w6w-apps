import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-pull-request.ts";

const params = { owner: "acme", repo: "api" };
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id, number: id, title: "T", state: "open", created_at: updated, updated_at: updated });
const body = (items: unknown[]) => items;
const ctx = (items: unknown[]) =>
  mockCtx([{ body: body(items) }], {
    display: { baseUrl: "https://git.example.com", owner: "acme" },
  });

test("new-or-updated-pull-request: seed check emits nothing and records the cursor/ids", async () => {
  const c = ctx([item(1)]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

const seed = () => trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);

test("new-or-updated-pull-request: emits only the record that is new", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-or-updated-pull-request: the same state and responses give the same result", async () => {
  const state = (await seed()).nextState;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-or-updated-pull-request: requests exactly the endpoint the list action calls", async () => {
  const state = (await seed()).nextState;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://git.example.com/api/v1/repos/acme/api/pulls?state=all&sort=recentupdate&page=1&limit=50",
  );
});

test("new-or-updated-pull-request: an edited record is a new event", async () => {
  const state = (await seed()).nextState;
  const r = await trigger.poll!({ ...input, state }, ctx([item(1, "2026-11-09T11:00:00Z")]).ctx);
  assertEquals(r.events, [item(1, "2026-11-09T11:00:00Z")]);
});

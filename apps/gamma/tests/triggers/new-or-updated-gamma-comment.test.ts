import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-gamma-comment.ts";

const params = { gammaId: "g_abc" };
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({
  id: `cmt_${id}`,
  contentText: "Hi",
  status: "open",
  replies: [],
  createdTime: updated,
  updatedTime: updated,
});
const body = (items: unknown[]) => ({ data: items, hasMore: false, nextCursor: null });
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);
const CURSOR = Date.parse("2026-11-09T10:00:00Z");
const seeded = {
  v: 1,
  kind: "ids",
  seeded: true,
  ids: ["cmt_1:2026-11-09T10:00:00Z"],
  cursor: CURSOR,
};
const realNow = Date.now;

test("new-or-updated-gamma-comment: seed check emits nothing and records the cursor/ids", async () => {
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

test("new-or-updated-gamma-comment: emits only the record that is new", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-or-updated-gamma-comment: the same state and responses give the same result", async () => {
  // The state carries a cursor stamped from the clock: pin it so the two runs are byte-equal.
  Date.now = () => Date.parse("2026-11-09T12:00:00Z");
  try {
    const state = seeded;
    const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
    const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
    assertEquals(a, b);
  } finally {
    Date.now = realNow;
  }
});

test("new-or-updated-gamma-comment: requests exactly the endpoint the list action calls", async () => {
  const state = seeded;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://public-api.gamma.app/v1.0/gammas/g_abc/comments?limit=50&updatedSince=2026-11-09T09%3A58%3A00.000Z",
  );
});

test("new-or-updated-gamma-comment: an edited record is a new event", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(1, "2026-11-09T11:00:00Z")]).ctx);
  assertEquals(r.events, [item(1, "2026-11-09T11:00:00Z")]);
});

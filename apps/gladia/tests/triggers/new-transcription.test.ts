import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transcription.ts";

const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id: `job-${id}`, status: "queued", kind: "pre-recorded", created_at: updated });
const body = (items: unknown[]) => ({ first: "", current: "", next: null, items });
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);
const CURSOR = Date.parse("2026-11-09T10:00:00Z");
const seeded = { v: 1, kind: "ids", seeded: true, ids: ["job-1"], cursor: CURSOR };
const realNow = Date.now;

test("new-transcription: seed check emits nothing and records the cursor/ids", async () => {
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

test("new-transcription: emits only the record that is new", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-transcription: the same state and responses give the same result", async () => {
  const state = seeded;
  const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(a, b);
});

test("new-transcription: requests exactly the endpoint the list action calls", async () => {
  const state = seeded;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.gladia.io/v2/pre-recorded?offset=0&limit=100&after_date=2026-11-09T09%3A58%3A00.000Z",
  );
});

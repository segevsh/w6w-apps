import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-activity.ts";

// Brief 9.9 (seed floor) and 9.8 (the unpaged window is read whole, never cut and never re-read).
const ORG = "11111111-2222-3333-4444-555555555555";
const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const item = (id: string, ms: number) => ({ id, type: "SERVICE_CREATED", createdAt: iso(ms) });
const run = async (state: unknown, now: number, items: unknown[]) => {
  clock.now = () => now;
  const m = mockCtx([{ status: 200, body: { result: items } }], {
    display: { organizationId: ORG, plane: "control" },
  });
  return { ...(await trigger.poll!({ ...input, state }, m.ctx)), calls: m.calls };
};
const many = (prefix: string, n: number, ts: number) =>
  Array.from({ length: n }, (_, i) => item(`${prefix}${i}`, ts));

test("new-activity: 250 activities that predate the seed never fire; one post-seed one does", async () => {
  const seeded = await run({}, T0, [item("seed", OLD)]);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);
  const flood = await run(seeded.nextState, T0 + 300_000, many("old", 250, OLD));
  assertEquals(flood.events, []);
  const fresh = item("fresh", T0 + 400_000);
  const next = await run(flood.nextState, T0 + 600_000, [...many("old", 250, OLD), fresh]);
  assertEquals(next.events, [fresh]);
});

test("new-activity: a 250-activity window is one request, emitted once, and the cursor advances", async () => {
  const seeded = await run({}, T0, [item("seed", OLD)]);
  const batch = many("n", 250, T0 + 100_000);
  const r1 = await run(seeded.nextState, T0 + 300_000, batch);
  assertEquals(r1.calls.length, 1);
  assertEquals(r1.events.length, 250);
  assertEquals((r1.nextState as { cursor?: number }).cursor, T0 + 300_000);
  assertEquals((r1.nextState as { resume?: unknown }).resume, undefined);
  const r2 = await run(r1.nextState, T0 + 600_000, batch);
  assertEquals(r2.events, []);
});

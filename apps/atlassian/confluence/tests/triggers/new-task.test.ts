import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";
import { clock } from "../../lib/tasks.ts";

// Brief 9.1(b) since-filter, 9.8 (a window longer than maxPages resumes, never stalls) and 9.9 (the
// seed floor: tasks that predate the first check never fire).
const base = "https://acme.atlassian.net/wiki/api/v2/tasks";
const display = { display: { site: "acme" } };
const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const OLD = T0 - 7_200_000;
const iso = (ms: number): string => new Date(ms).toISOString();
let seq = 0;
const task = (createdMs: number) => ({ id: `task-${++seq}`, createdAt: iso(createdMs) });
const page = (results: unknown[], cursor?: string): MockResponse => ({
  body: {
    results,
    _links: cursor ? { next: `/wiki/api/v2/tasks?limit=100&cursor=${cursor}` } : {},
  },
});
const run = async (state: unknown, now: number, responses: MockResponse[], params = {}) => {
  clock.now = () => now;
  const m = mockCtx(responses, display);
  const result = await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx);
  return { result, calls: m.calls };
};
const ids = (events: unknown[]) => events.map((e) => (e as { id: string }).id).sort();

describe("new-task", () => {
  test("seeds without emitting, then emits only the task created after the seed", async () => {
    const old = task(OLD);
    const seeded = await run({}, T0, [page([old])]);
    assertEquals(seeded.result.events, []);
    assertEquals((seeded.result.nextState as { seeded?: boolean }).seeded, true);
    const fresh = task(T0 + 60_000);
    const first = await run(seeded.result.nextState, T0 + 300_000, [page([fresh, old])]);
    const retry = await run(seeded.result.nextState, T0 + 300_000, [page([fresh, old])]);
    assertEquals(first.result.events, [fresh]);
    assertEquals(retry.result, first.result);
  });

  test("sends created-at-from (epoch ms of cursor minus overlap) as the literal request", async () => {
    const seed = await run({}, T0, [page([])]);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${base}?created-at-from=${T0 - 3_600_000}&limit=100`);
    const later = await run(seed.result.nextState, T0 + 300_000, [page([])], { spaceId: "7, 8" });
    assertEquals(
      later.calls[0].url,
      `${base}?created-at-from=${T0 - 3_600_000}&space-id=7&space-id=8&limit=100`,
    );
  });

  test("more than maxPages pages of pre-seed tasks never fire (9.9)", async () => {
    const seeded = await run({}, T0, [page([])]);
    const preSeed = () => Array.from({ length: 5 }, () => task(OLD));
    const t1 = T0 + 300_000;
    const a = await run(seeded.result.nextState, t1, [
      page(preSeed(), "c2"),
      page(preSeed(), "c3"),
      page(preSeed(), "c4"),
    ]);
    assertEquals(a.result.events, []);
    const b = await run(a.result.nextState, t1 + 300_000, [page(preSeed())]);
    assertEquals(b.result.events, []);
    const fresh = task(t1 + 400_000);
    const c = await run(b.result.nextState, t1 + 600_000, [page([fresh])]);
    assertEquals(c.result.events, [fresh]);
  });

  test("a long window is drained across checks, each task once, then the cursor advances (9.8)", async () => {
    const seeded = await run({}, T0, [page([])]);
    const t1 = T0 + 600_000;
    const batch = (n: number) => Array.from({ length: 5 }, (_, i) => task(T0 + n * 1000 + i + 1));
    const [p1, p2, p3, p4] = [batch(1), batch(2), batch(3), batch(4)];
    const a = await run(seeded.result.nextState, t1, [
      page(p1, "c2"),
      page(p2, "c3"),
      page(p3, "c4"),
    ]);
    assertEquals(ids(a.result.events), ids([...p1, ...p2, ...p3]));
    const b = await run(a.result.nextState, t1 + 300_000, [page(p4)]);
    assertEquals(
      b.calls[0].url,
      `${base}?created-at-from=${T0 - 3_600_000}&limit=100&cursor=c4`,
    );
    assertEquals(ids(b.result.events), ids(p4));
    assertEquals((b.result.nextState as { cursor?: number }).cursor, t1);
    const c = await run(b.result.nextState, t1 + 600_000, [page([...p4, ...p3])]);
    assertEquals(c.result.events, []);
  });
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newOrUpdatedResearchTask from "../../triggers/new-or-updated-research-task.ts";
import newOrUpdatedExtractTask from "../../triggers/new-or-updated-extract-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };

const cases = [
  { trigger: newOrUpdatedTask, path: "/v1/tasks" },
  { trigger: newOrUpdatedResearchTask, path: "/v1/research" },
  { trigger: newOrUpdatedExtractTask, path: "/v1/extract" },
];

for (const { trigger, path } of cases) {
  const task = (id: string, status: string, updatedAt: string) => ({
    id,
    status,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt,
  });
  const page = (...items: unknown[]) => ({
    body: { data: items, metadata: { total: items.length } },
  });
  const pending = task("t1", "pending", "2026-11-09T10:00:00.000Z");
  const done = task("t1", "completed", "2026-11-09T11:00:00.000Z");
  const fresh = task("t2", "pending", "2026-11-09T11:30:00.000Z");

  test(`${trigger.key}: seeds, fires on a new and on an updated task, retries, requests ${path} by updatedAt`, async () => {
    const seed = mockCtx([page(pending)]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      `https://api.linkup.so${path}?pageSize=100&sortBy=updatedAt&sortDirection=desc`,
    );
    const run = (...items: unknown[]) =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page(...items)]).ctx);
    const first = await run(fresh, done, pending);
    assertEquals(first.events, [done, fresh]);
    assertEquals(await run(fresh, done, pending), first);
    // Unchanged task (same id, same updatedAt) does not fire.
    assertEquals((await run(pending)).events, []);
  });
}

test("new-or-updated-task pages past 100 updates in one window (page 2 requested, nothing dropped)", async () => {
  const mk = (n: number) => ({
    id: `t${n}`,
    status: "completed",
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T12:00:00.000Z",
  });
  const seeded = await newOrUpdatedTask.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [mk(0)], metadata: { page: 1, totalPages: 1 } } }]).ctx,
  );
  const p1 = Array.from({ length: 100 }, (_, i) => mk(200 - i));
  const p2 = Array.from({ length: 50 }, (_, i) => mk(100 - i));
  const m = mockCtx([
    { body: { data: p1, metadata: { page: 1, totalPages: 2 } } },
    { body: { data: p2, metadata: { page: 2, totalPages: 2 } } },
  ]);
  const out = await newOrUpdatedTask.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(m.calls.length, 2);
  assertEquals(
    m.calls[1].url,
    "https://api.linkup.so/v1/tasks?page=2&pageSize=100&sortBy=updatedAt&sortDirection=desc",
  );
  assertEquals(out.events.length, 100); // kit maxEvents: oldest 100 of the 150 unseen
  assertEquals(out.events[0], p2[49]);
});

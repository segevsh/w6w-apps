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

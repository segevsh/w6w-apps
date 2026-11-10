import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTask from "../../triggers/new-task.ts";
import newResearchTask from "../../triggers/new-research-task.ts";
import newExtractTask from "../../triggers/new-extract-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };

const cases = [
  { trigger: newTask, path: "/v1/tasks" },
  { trigger: newResearchTask, path: "/v1/research" },
  { trigger: newExtractTask, path: "/v1/extract" },
];

for (const { trigger, path } of cases) {
  const task = (id: string) => ({ id, status: "pending", createdAt: "2026-11-09T12:00:00.000Z" });
  const page = (...ids: string[]) => ({
    body: { data: ids.map(task), metadata: { total: ids.length } },
  });

  test(`${trigger.key}: seeds, emits the new task, retries, and requests ${path} newest-first`, async () => {
    const seed = mockCtx([page("t1")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    const url = new URL(seed.calls[0].url);
    assertEquals(url.origin + url.pathname, `https://api.linkup.so${path}`);
    assertEquals(url.searchParams.get("sortBy"), "createdAt");
    assertEquals(url.searchParams.get("sortDirection"), "desc");
    assertEquals(url.searchParams.get("pageSize"), "100");
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page("t2", "t1")]).ctx);
    const first = await run();
    assertEquals(first.events, [task("t2")]);
    assertEquals(await run(), first);
  });
}

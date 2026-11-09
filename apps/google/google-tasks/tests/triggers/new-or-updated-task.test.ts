import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-task.ts";

const input = { params: { taskList: "list-1" }, subscriptionId: "sub-1" };
const task = (id: string) => ({ id, title: `Task ${id}`, updated: "2026-11-09T09:00:00Z" });

test("new-or-updated-task: seeds, emits updates, retries idempotently, and uses updatedMin", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T10:00:00Z");
  try {
    const seededCtx = mockCtx([{ body: { items: [task("a")] } }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seededCtx.calls[0].method, "GET");
    assertEquals(
      seededCtx.calls[0].url,
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks?updatedMin=2026-11-09T09%3A58%3A00.000Z&maxResults=100",
    );
    const page = [task("b"), task("a")];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { items: page } }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { items: page } }]).ctx,
    );
    assertEquals(first.events, [task("b")]);
    assertEquals(retry, first);
  } finally {
    clock.now = originalNow;
  }
});

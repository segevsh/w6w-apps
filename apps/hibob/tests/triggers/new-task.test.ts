import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const task = (id: number) => ({ id, title: `Task ${id}` });
const page = (tasks: unknown[]) => ({ tasks });

test("new-task seeds, emits an added task, retries idempotently, and requests the literal bounded endpoint", async () => {
  const seedCtx = mockCtx([{ body: page([task(1)]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(seedCtx.calls[0].url, "https://api.hibob.com/v1/tasks");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([task(2), task(1)]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([task(2), task(1)]) }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "2", values: task(2) }]);
  assertEquals(retry, first);
});

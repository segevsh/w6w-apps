import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-task.ts";

const item = (id: string, updated_at = id) => ({ id, title: id, updated_at });
const input = { params: {}, subscriptionId: "sub" };
const ctx = (items: unknown[]) => mockCtx([{ body: { results: items, total: items.length } }]);

test("new-or-updated-task seeds, emits new tasks, retries, and requests updated order", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.mem.ai/v2/tasks?limit=100&order_by=updated_at");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-task emits an edited task (same id, new updated_at) exactly once", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item("a", "1")]).ctx,
  );
  const edited = item("a", "2");
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([edited]).ctx);
  assertEquals(first.events, [edited]);
  const again = await trigger.poll!({ ...input, state: first.nextState }, ctx([edited]).ctx);
  assertEquals(again.events, []);
});

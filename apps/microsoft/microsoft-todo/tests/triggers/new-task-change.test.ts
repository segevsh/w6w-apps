import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task-change.ts";
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);
test("new-task-change seeds, emits changes, retries, and requests received-date order", async () => {
  const seed = ctx([item("a")]);
  const input = { params: { taskList: "L1" }, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks/delta?%24orderby=receivedDateTime+desc&%24top=100",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

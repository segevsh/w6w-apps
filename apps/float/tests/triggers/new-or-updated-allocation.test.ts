import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-allocation.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, stamp = "2026-11-09 12:00:00") => ({ task_id: id, modified: stamp });
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

test("new-or-updated-allocation: first check seeds and emits nothing", async () => {
  const seed = ctx([item("b"), item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-allocation: emits only the new item after seeding", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("b"), item("a")]).ctx,
  );
  assertEquals(next.events, [item("b")]);
  const quiet = await trigger.poll!(
    { ...input, state: next.nextState },
    ctx([item("b"), item("a")]).ctx,
  );
  assertEquals(quiet.events, []);
});

test("new-or-updated-allocation: retrying the same state and page is idempotent", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const page = [item("c"), item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b"), item("c")]);
  assertEquals(retry, first);
});

test("new-or-updated-allocation: requests the wrapped list action newest first", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.float.com/v3/tasks?page=1&per-page=100&sort=-modified",
  );
});

test("new-or-updated-allocation: an edited record is a new event", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item("a", "2026-11-09 12:00:00")]).ctx,
  );
  const edited = item("a", "2026-11-09 13:00:00");
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([edited, item("a", "2026-11-09 12:00:00")]).ctx,
  );
  assertEquals(next.events, [edited]);
});

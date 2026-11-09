import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, paginationHeaders } from "../_helpers.ts";
import trigger from "../../triggers/new-allocation.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (task_id: string) => ({ task_id });
const ctx = (items: unknown[]) => mockCtx([{ body: items, headers: paginationHeaders() }]);

test("new-allocation: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.float.com/v3/tasks?page=1&per-page=100&sort=created_at%3Adesc",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, paginationHeaders } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-allocation.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (task_id: string, modified_at: string) => ({ task_id, modified_at });
const ctx = (items: unknown[]) => mockCtx([{ body: items, headers: paginationHeaders() }]);

test("new-or-updated-allocation: seeds, emits edits, retries idempotently, requests newest updated first", async () => {
  const seed = ctx([item("a", "2026-11-09T12:00:00Z")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.float.com/v3/tasks?page=1&per-page=100&sort=modified_at%3Adesc",
  );
  const page = [item("a", "2026-11-09T13:00:00Z"), item("a", "2026-11-09T12:00:00Z")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("a", "2026-11-09T13:00:00Z")]);
  assertEquals(retry, first);
});

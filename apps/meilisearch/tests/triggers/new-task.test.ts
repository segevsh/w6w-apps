import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const conn = { display: { baseUrl: "https://search.example.com" } };
const task = (uid: number) => ({ uid, status: "succeeded" });
const ctx = (uids: number[]) =>
  mockCtx([{ status: 200, body: { results: uids.map(task), next: null } }], conn);

test("new-task: seeds, emits only new tasks, retries idempotently, requests the newest-first page", async () => {
  const seed = ctx([1]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    origin: request.origin,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    origin: "https://search.example.com",
    path: "/tasks",
    // No `reverse`: the vendor default is descending uid (newest first).
    query: { limit: "100" },
  });
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx([3, 2, 1]).ctx);
  const retry = await trigger.poll!(later, ctx([3, 2, 1]).ctx);
  assertEquals(first.events, [task(2), task(3)]);
  assertEquals(retry, first);
});

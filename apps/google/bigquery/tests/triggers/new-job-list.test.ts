import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job-list.ts";

const params = {};
const A = { id: "job-a" };
const B = { id: "job-b" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { jobs: items } }];
  return mockCtx(r, { display: { projectId: "p1" } });
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-job-list seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-job-list emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-job-list returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-job-list requests the jobs list, newest first", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://bigquery.googleapis.com/bigquery/v2/projects/p1/jobs?maxResults=100",
  );
});

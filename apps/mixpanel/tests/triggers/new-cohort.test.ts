import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-cohort.ts";

const conn = { display: { projectId: "123", region: "us" } };
const cohort = (id: number, count = 1) => ({ id, name: `c${id}`, count });
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: items }], conn);
const input = { params: {}, subscriptionId: "sub" };

test("new-cohort seeds without events", async () => {
  const seed = ctx([cohort(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-cohort emits only the new cohort, is idempotent, ignores size changes", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([cohort(1)]).ctx);
  const page = [cohort(2), cohort(1, 99)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [{ change: "added", key: "2", values: cohort(2) }]);
  assertEquals(retry, first);
});

test("new-cohort posts to the cohorts list route (same request as cohort-list)", async () => {
  const run = ctx([cohort(1)]);
  await trigger.poll!({ ...input, state: {} }, run.ctx);
  assertEquals(run.calls[0].method, "POST");
  assertEquals(run.calls[0].url, "https://mixpanel.com/api/query/cohorts/list?project_id=123");
  assertEquals(run.calls[0].body, "");
});

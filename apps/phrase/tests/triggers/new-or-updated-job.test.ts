import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-job.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: { projectId: "proj-9" }, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const URL_AT_NOW =
  "https://api.phrase.com/v2/projects/proj-9/jobs?updated_since=2026-11-10T11%3A50%3A00.000Z&page=1&per_page=100";
const job = (id: string, updated: string) => ({ id, updated_at: updated });

test("new-or-updated-job: seeds without reading or emitting, then requests the since-filtered feed", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0);
  const next = mockCtx([{ body: [] }]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(next.calls[0].method, "GET");
  assertEquals(next.calls[0].url, URL_AT_NOW);
});

test("new-or-updated-job: emits a new job and an edited job; retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const page = [
    job("job-2", "2026-11-10T12:01:00Z"),
    job("job-1", "2026-11-10T12:02:00Z"),
  ];
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.length, 2);
  assertEquals(await run(), first);
});

test("new-or-updated-job: an unchanged job is not re-emitted", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]).ctx,
  );
  clock.now = () => NOW + 300_000;
  const res = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]).ctx,
  );
  assertEquals(res.events, []);
});

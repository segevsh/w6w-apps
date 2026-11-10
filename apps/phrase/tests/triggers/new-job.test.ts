import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: { projectId: "proj-9" }, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
// cursor - 10 min overlap, as the trigger binds `updated_since`.
const URL_AT_NOW =
  "https://api.phrase.com/v2/projects/proj-9/jobs?updated_since=2026-11-10T11%3A50%3A00.000Z&page=1&per_page=100";
const job = (id: string, created: string) => ({
  id,
  name: id,
  created_at: created,
  updated_at: created,
});

test("new-job: seeds without emitting and requests the since-filtered feed", async () => {
  clock.now = () => NOW;
  const seed = mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_AT_NOW);
});

test("new-job: emits only the unseen job, and a retry is idempotent", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: [job("job-1", "2026-11-10T11:55:00Z")] }]).ctx,
  );
  const page = [job("job-2", "2026-11-10T12:01:00Z"), job("job-1", "2026-11-10T11:55:00Z")];
  clock.now = () => NOW + 300_000;
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events.map((e) => (e as { id: string }).id), ["job-2"]);
  assertEquals(await run(), first);
});

test("new-job: an edited old job is not a new job", async () => {
  clock.now = () => NOW;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: [] }]).ctx);
  clock.now = () => NOW + 300_000;
  const edited = {
    id: "job-old",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2026-11-10T12:02:00Z",
  };
  const res = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [edited] }]).ctx,
  );
  assertEquals(res.events, []);
});

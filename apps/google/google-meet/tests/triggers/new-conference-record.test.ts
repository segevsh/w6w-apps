import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-conference-record.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const record = (name: string) => ({ name, startTime: "2026-11-09T09:00:00Z", space: "spaces/abc" });

test("new-conference-record: seeds, emits new records, retries idempotently, and requests newest first", async () => {
  const seededCtx = mockCtx([{ body: { conferenceRecords: [record("conferenceRecords/a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(
    seededCtx.calls[0].url,
    "https://meet.googleapis.com/v2/conferenceRecords?pageSize=100",
  );
  const page = [record("conferenceRecords/b"), record("conferenceRecords/a")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { conferenceRecords: page } }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { conferenceRecords: page } }]).ctx,
  );
  assertEquals(first.events, [record("conferenceRecords/b")]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-workflow-run.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-workflow-run: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{ body: { data: [{ id: "run-1" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://public-api.process.st/api/v1.1/workflow-runs/list");
  const page = { data: [{ id: "run-2" }, { id: "run-1" }] };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job-invoice.ts";

test("new-job-invoice seeds, emits, retries, and requests newest first", async () => {
  const input = { params: { jobId: "j1" }, subscriptionId: "s" };
  const seed = mockCtx([{ body: { items: [{ id: "a" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.acculynx.com/api/v2/jobs/j1/invoices?sortOrder=Descending",
  );
  const body = { items: [{ id: "b" }, { id: "a" }] };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body }]).ctx);
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});

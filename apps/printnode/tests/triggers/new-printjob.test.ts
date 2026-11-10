import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-printjob.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const job = (id: number) => ({ id, state: "queued" });
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

test("new-printjob seeds, emits, retries, and requests the documented newest-first page", async () => {
  const seed = ctx([job(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.printnode.com/printjobs?limit=100",
  });
  const page = [job(2), job(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [job(2)]);
  assertEquals(retry, first);
});

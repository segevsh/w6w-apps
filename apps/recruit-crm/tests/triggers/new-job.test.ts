import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-job: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ data: [{ id: "a" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.recruitcrm.io/v1/jobs?limit=100&page=1&sort_by=created_at&sort_order=desc",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b" }, { id: "a" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b" }, { id: "a" }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

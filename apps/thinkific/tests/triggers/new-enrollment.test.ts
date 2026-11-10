import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-enrollment.ts";

const item = (id: number) => ({ id });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-enrollment seeds, emits new rows, retries, and requests the literal enrollment page", async () => {
  const seed = mockCtx([{ body: listEnvelope([item(1)]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.thinkific.com/api/public/v1/enrollments?page=1&limit=250",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([item(2), item(1)]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([item(2), item(1)]) }]).ctx,
  );
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});

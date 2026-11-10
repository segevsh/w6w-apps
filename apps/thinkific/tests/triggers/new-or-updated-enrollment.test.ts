import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-enrollment.ts";

const item = (id: number, updated_at: string) => ({ id, updated_at });
const input = { params: {}, subscriptionId: "sub-1" };

test("new-or-updated-enrollment seeds, emits an edit, retries, and requests the literal page", async () => {
  const old = item(1, "2026-11-09T11:00:00Z");
  const seed = mockCtx([{ body: listEnvelope([old]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.thinkific.com/api/public/v1/enrollments?page=1&limit=250",
  );
  const changed = item(1, "2026-11-09T12:00:00Z");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([changed, old]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: listEnvelope([changed, old]) }]).ctx,
  );
  assertEquals(first.events, [changed]);
  assertEquals(retry, first);
});

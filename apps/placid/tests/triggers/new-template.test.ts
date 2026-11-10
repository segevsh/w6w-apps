import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-template.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-template: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{
    body: { data: [{ id: "template-1", created_at: "2026-01-01T00:00:00Z" }] },
  }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.placid.app/api/rest/templates?order_by=created_at-desc",
  );
  const page = {
    data: [{ id: "template-2", created_at: "2026-01-02T00:00:00Z" }, { id: "template-1" }],
  };
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

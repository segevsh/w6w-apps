import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-purchase.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = { id: 1 };
const body = (items: unknown[]) => ({
  data: items,
  pagination: { page: 1, per_page: 100, total: items.length, total_pages: 1 },
});

test("new-purchase: seeds, emits unseen rows, retries idempotently, and requests the wrapped feed", async () => {
  const seededCtx = mockCtx([{ body: body([item]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} } as never, seededCtx.ctx);
  assertEquals((seeded as { events: unknown[] }).events, []);
  assertEquals((seeded as { nextState: { seeded?: boolean } }).nextState.seeded, true);
  const added = {
    ...item,
    id: "new-id",
    contactId: "new-id",
    shipmentId: "new-id",
    sequenceId: "new-id",
  };
  const page = body([added, item]);
  const nextCtx = mockCtx([{ body: page }]);
  const first = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    nextCtx.ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: (seeded as { nextState: unknown }).nextState } as never,
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals((first as { events: unknown[] }).events, [added]);
  assertEquals(retry, first);
  assertEquals(nextCtx.calls[0].method, "GET");
  assertEquals(nextCtx.calls[0].url, "https://simplero.com/api/v2/purchases?page=1&per_page=100");
});

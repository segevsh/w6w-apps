import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const input = { params: { tableId: "tbl-1" }, subscriptionId: "sub-1" };
const item = { id: "record-a" };
const body = (items: unknown[]) => ({ items: items });

test("new-record: seeds, emits unseen rows, retries idempotently, and requests the wrapped feed", async () => {
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
  assertEquals(nextCtx.calls[0].method, "POST");
  assertEquals(
    nextCtx.calls[0].url,
    "https://app.smartsuite.com/api/v1/applications/tbl-1/records/list/?offset=0&limit=100",
  );
  assertEquals(nextCtx.calls[0].body, '{"sort":[{"field":"created_at","direction":"desc"}]}');
});

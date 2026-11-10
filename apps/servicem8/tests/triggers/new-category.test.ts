import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-category.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = { uuid: "category-a" };
const body = (items: unknown[]) => items;

test("new-category: seeds, emits unseen rows, retries idempotently, and requests the wrapped feed", async () => {
  const seededCtx = mockCtx([{ body: body([item]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} } as never, seededCtx.ctx);
  assertEquals((seeded as { events: unknown[] }).events, []);
  assertEquals((seeded as { nextState: { seeded?: boolean } }).nextState.seeded, true);
  const added = { uuid: "new-id" };
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
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.servicem8.com/api_1.0/category.json?%24sort=created_at+DESC",
  );
});

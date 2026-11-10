import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listBody, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-user.ts";
const item = (id: string, updated_at: string) => ({ id, updated_at });
test("new-or-updated-user seeds, emits edits, retries, and requests updated ordering", async () => {
  const seed = mockCtx([{ body: listBody([item("a", "1")]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://rest.ripplingapis.com/users/?order_by=updated_at+desc&limit=100",
  );
  const body = listBody([item("a", "2"), item("a", "1")]);
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [item("a", "2")]);
  assertEquals(retry, first);
});

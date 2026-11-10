import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listBody, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const item = (id: string) => ({ id });
test("new-user seeds, emits new users, retries, and requests newest-first users", async () => {
  const seed = mockCtx([{ body: listBody([item("a")]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://rest.ripplingapis.com/users/?order_by=created_at+desc&limit=100",
  );
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: listBody([item("b"), item("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: listBody([item("b"), item("a")]) }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

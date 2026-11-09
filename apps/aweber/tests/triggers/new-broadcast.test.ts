import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { entries, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-broadcast.ts";

test("new-broadcast seeds, emits, retries, and requests sent broadcasts", async () => {
  const params = { accountId: "1", listId: "2" };
  const seed = await trigger.poll!(
    { params, state: {} },
    mockCtx([{ body: entries([{ id: "a" }]) }]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
  const nextCtx = mockCtx([{ body: entries([{ id: "b" }, { id: "a" }]) }]);
  const next = await trigger.poll!({ params, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seed.nextState },
    mockCtx([{ body: entries([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.aweber.com/1.0/accounts/1/lists/2/broadcasts?status=sent&ws.start=0&ws.size=100",
  );
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-user.ts";
const item = (_id: string, _updatedAt: string) => ({ _id, _updatedAt });
test("new-or-updated-user seeds, emits edits, retries, and sends a literal update sort", async () => {
  const seed = mockCtx([{ body: { users: [item("a", "1")] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.rocket.chat/api/v1/users.list?count=100&offset=0&sort=%7B%22_updatedAt%22%3A-1%7D",
  );
  const body = { users: [item("a", "2"), item("a", "1")] };
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

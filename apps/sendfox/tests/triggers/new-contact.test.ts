import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-contact.ts";
const item = (id: number) => ({ id });
test("new-contact seeds, emits, retries, and requests literal created-since contacts", async () => {
  clock.now = () => 1_794_182_400_000;
  const seed = mockCtx([{ body: page([item(1)]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.sendfox.com/contacts?per_page=100&filter%5Bcreated_after%5D=1970-01-01T00%3A00%3A00Z",
  );
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page([item(2), item(1)]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page([item(2), item(1)]) }]).ctx,
  );
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-subscriber.ts";
const item = (id: string, modified: string) => ({ id, modified });
test("new-or-updated-subscriber seeds, emits edits, retries, and requests modified ordering", async () => {
  const seed = mockCtx([{ body: listEnvelope([item("a", "1")]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.sender.net/v2/subscribers?page=1&limit=100&order=modified&direction=desc",
  );
  const body = listEnvelope([item("a", "2"), item("a", "1")]);
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

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-pin.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-pin: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{ body: { items: [{ id: "pin-1" }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.pinterest.com/v5/pins?page_size=100");
  const page = { items: [{ id: "pin-2" }, { id: "pin-1" }] };
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

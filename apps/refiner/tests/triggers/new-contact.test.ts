import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-contact: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ items: [{ uuid: "a" }], pagination: {} });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.refiner.io/v1/contacts?order_by=first_seen_at&page=1&page_length=100",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ uuid: "b" }, { uuid: "a" }], pagination: {} }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ uuid: "b" }, { uuid: "a" }], pagination: {} }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

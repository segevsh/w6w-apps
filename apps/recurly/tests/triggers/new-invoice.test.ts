import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-invoice: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ object: "list", data: [{ id: "a" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, connected(seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://v3.recurly.com/invoices?limit=100&order=desc&sort=created_at",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    connected(ctx({ object: "list", data: [{ id: "b" }, { id: "a" }] }).ctx),
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    connected(ctx({ object: "list", data: [{ id: "b" }, { id: "a" }] }).ctx),
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

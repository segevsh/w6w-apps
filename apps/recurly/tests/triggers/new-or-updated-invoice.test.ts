import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-or-updated-invoice: seeds, emits new rows, retries idempotently, and requests the literal feed", async () => {
  const seed = ctx({ data: [{ id: "a", updated_at: "t1" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://v3.recurly.com/invoices?limit=100&order=desc&sort=updated_at",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b", updated_at: "t3" }, { id: "a", updated_at: "t1" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b", updated_at: "t3" }, { id: "a", updated_at: "t1" }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ id: "b", updated_at: "t3" }]);
  assertEquals(retry, first);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "a", updated_at: "t2" }] }).ctx,
  );
  assertEquals(edited.events.length, 1);
});

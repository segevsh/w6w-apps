import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (
  id: string,
  stamp = "stamp-1",
) => ({ id, invoiceNumber: `INV-${id}`, updatedDate: stamp });
const page = (...rows: unknown[]) => mockCtx([{ body: { data: rows } }]);

test("new-or-updated-invoice: the first check seeds without events and sends the documented request", async () => {
  const seed = page(item("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://rest.zuora.com/object-query/invoices?sort%5B%5D=updateddate.DESC&pageSize=50",
  );
});

test("new-or-updated-invoice: emits only the new invoice, and a retry from the same state is identical", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const rows = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
  const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
  assertEquals(again.events, []);
});

test("new-or-updated-invoice: an edited invoice is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a", "stamp-1")).ctx);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    page(item("a", "stamp-2")).ctx,
  );
  assertEquals(edited.events, [item("a", "stamp-2")]);
  const untouched = await trigger.poll!(
    { ...input, state: edited.nextState },
    page(item("a", "stamp-2")).ctx,
  );
  assertEquals(untouched.events, []);
});

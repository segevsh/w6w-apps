import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuadernoCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const invoice = (id: number) => ({ id, number: `INV-${id}` });
const ctx = (items: unknown[]) => mockQuadernoCtx([{ body: items }]);

test("new-invoice seeds, emits, retries, and requests the literal invoice page", async () => {
  const seed = ctx([invoice(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://acme.quadernoapp.com/api/invoices?limit=100",
  });
  const page = [invoice(2), invoice(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [invoice(2)]);
  assertEquals(retry, first);
});

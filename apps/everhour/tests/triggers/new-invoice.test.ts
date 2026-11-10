import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const row = (id: number, name = `Invoice ${id}`) => ({ id, name });

test("new-invoice: seeds, emits only added invoices, retries idempotently, and requests GET /invoices", async () => {
  const seed = mockCtx([{ body: [row(1)] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: [row(1), row(2)] };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [row(2)]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://api.everhour.com/invoices");
});

test("new-invoice: edits and removals do not emit", async () => {
  const seed = mockCtx([{ body: [row(1), row(2)] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const next = mockCtx([{ body: [row(1, "Renamed")] }]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(result.events, []);
});

test("new-invoice: fails loudly past the 5000-row cap", async () => {
  const many = Array.from({ length: 5001 }, (_, i) => row(i + 1));
  const { ctx } = mockCtx([{ body: many }]);
  await assertRejects(() => trigger.poll!({ ...input, state: {} }, ctx), Error, "5000");
});

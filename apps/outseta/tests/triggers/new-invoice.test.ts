import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ Uid: id });
const ctx = (items: unknown[]) =>
  (() => {
    const m = mockCtx([{ body: { metadata: {}, items } }]);
    return { ...m, ctx: connected(m.ctx) };
  })();

test("new-invoice: seeds, emits only unseen items, retries idempotently, requests newest first (orderBy Created DESC)", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://acme.outseta.com/api/v1/billing/invoices?limit=25&orderBy=Created+DESC",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

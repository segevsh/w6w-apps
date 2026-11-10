import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newQuote from "../../triggers/new-quote.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newOrder from "../../triggers/new-order.ts";
import newPaymentRequest from "../../triggers/new-payment-request.ts";

type Trig = {
  poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }>;
};
const poll = (t: unknown, state: unknown, c: unknown) =>
  (t as Trig).poll!({ params: {}, state, subscriptionId: "sub" } as never, c as never);
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;
const conn = (root: string, ids: string[], next: string | null = null) => ({
  body: {
    data: {
      [root]: {
        nodes: ids.map((id) => ({ id })),
        pageInfo: { hasNextPage: next !== null, endCursor: next },
      },
    },
  },
});
const sent = (call: { body: string | null }) =>
  JSON.parse(call.body ?? "{}") as { query: string; variables: Record<string, unknown> };

for (
  const c of [
    { name: "new-quote", t: newQuote, root: "quotes" },
    { name: "new-invoice", t: newInvoice, root: "invoices" },
    { name: "new-order", t: newOrder, root: "orders" },
  ]
) {
  test(`${c.name}: seeds, emits the new record, retries idempotently, requests VISUAL_ID descending`, async () => {
    const seed = mockCtx([conn(c.root, ["a"])]);
    const seeded = await poll(c.t, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://www.printavo.com/api/v2");
    assertEquals(sent(seed.calls[0]).variables, {
      first: 100,
      sortOn: "VISUAL_ID",
      sortDescending: true,
    });
    assertEquals(sent(seed.calls[0]).query.includes(`${c.root}(first: $first`), true);
    const run = () => poll(c.t, seeded.nextState, mockCtx([conn(c.root, ["b", "a"])]).ctx);
    const first = await run();
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(await run(), first);
  });
}

test("new-payment-request: seeds, emits only a newly open request, retries, asks for OPEN", async () => {
  const seed = mockCtx([conn("paymentRequests", ["a"])]);
  const seeded = await poll(newPaymentRequest, {}, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(sent(seed.calls[0]).variables, { first: 100, status: "OPEN" });
  assertEquals(sent(seed.calls[0]).query.includes("paymentRequests(first: $first"), true);
  const run = () =>
    poll(newPaymentRequest, seeded.nextState, mockCtx([conn("paymentRequests", ["a", "b"])]).ctx);
  const first = await run();
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(await run(), first);
});

test("new-payment-request: follows the cursor across pages and refuses a list past the cap", async () => {
  const two = mockCtx([conn("paymentRequests", ["a"], "CUR1"), conn("paymentRequests", ["b"])]);
  const seeded = await poll(newPaymentRequest, {}, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(sent(two.calls[1]).variables, { first: 100, status: "OPEN", after: "CUR1" });
  let err = "";
  try {
    const pages = [1, 2, 3, 4, 5].map((n) => conn("paymentRequests", [`x${n}`], `C${n}`));
    await poll(newPaymentRequest, seeded.nextState, mockCtx(pages).ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("too large to snapshot"), true);
});

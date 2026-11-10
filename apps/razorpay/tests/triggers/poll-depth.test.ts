import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { collection, mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newDispute from "../../triggers/new-dispute.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newItem from "../../triggers/new-item.ts";
import newOrderPayment from "../../triggers/new-order-payment.ts";
import newPayment from "../../triggers/new-payment.ts";
import newPaymentLink from "../../triggers/new-payment-link.ts";
import newPlan from "../../triggers/new-plan.ts";
import newRefund from "../../triggers/new-refund.ts";
import newSettlement from "../../triggers/new-settlement.ts";
import newSubscription from "../../triggers/new-subscription.ts";

const API = "https://api.razorpay.com/v1";
const CURSOR = 1_700_000_000_000; // ms; the window starts 120 s earlier = 1699999880 s
const FROM = "from=1699999880";
const FUTURE = 4_000_000_000; // created_at (s) far after any seed
const PAST = 1_000_000_000; // created_at (s) long before any seed

// Since-filter feeds (brief 9.1 b, 9.8, 9.9): `from` is Razorpay's created-at filter, paged by skip.
const feeds = [
  { name: "new-payment", trigger: newPayment, path: "/payments" },
  { name: "new-refund", trigger: newRefund, path: "/refunds" },
  { name: "new-settlement", trigger: newSettlement, path: "/settlements" },
  { name: "new-invoice", trigger: newInvoice, path: "/invoices" },
  { name: "new-subscription", trigger: newSubscription, path: "/subscriptions" },
];

const rec = (id: string, created_at: number) => ({ id, created_at });
const page = (tag: string, created_at: number, n = 100) => ({
  body: collection(Array.from({ length: n }, (_, i) => rec(`${tag}-${i}`, created_at))),
});
const input = { params: {}, subscriptionId: "sub-1" };

async function atNow<T>(ms: number, run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => ms;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

for (const f of feeds) {
  // a long-held cursor 600 s before "now": the window starts at 1699999280 s
  const state = { v: 1, kind: "ids", seeded: true, ids: [], floor: 1000, cursor: CURSOR - 600_000 };
  const OLD_FROM = "from=1699999280";

  test(`${f.name}: seed emits nothing, a new row fires once, the request is literal`, async () => {
    const seed = mockCtx([{ body: collection([rec("old", PAST)]) }]);
    const seeded = await atNow(CURSOR, () => f.trigger.poll!({ ...input, state: {} }, seed.ctx));
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${API}${f.path}?${FROM}&count=100&skip=0`);
    const run = () =>
      atNow(CURSOR + 60_000, () =>
        f.trigger.poll!(
          { ...input, state: seeded.nextState },
          mockCtx([{ body: collection([rec("new", FUTURE), rec("old", PAST)]) }]).ctx,
        ));
    const first = await run();
    assertEquals(first.events, [rec("new", FUTURE)]);
    assertEquals(await run(), first);
  });

  test(`${f.name}: a window of 6 pages drains over two checks, none twice, then the cursor moves`, async () => {
    const a = mockCtx([1, 2, 3, 4, 5].map((n) => page(`p${n}`, FUTURE)));
    const one = await atNow(CURSOR, () => f.trigger.poll!({ ...input, state }, a.ctx));
    assertEquals(one.events.length, 500);
    assertEquals(
      a.calls.map((c) => c.url),
      [0, 100, 200, 300, 400].map((s) => `${API}${f.path}?${OLD_FROM}&count=100&skip=${s}`),
    );
    assertEquals((one.nextState as { cursor: number }).cursor, CURSOR - 600_000); // held while draining
    const b = mockCtx([page("p6", FUTURE, 50)]);
    const two = await atNow(
      CURSOR + 60_000,
      () => f.trigger.poll!({ ...input, state: one.nextState }, b.ctx),
    );
    assertEquals(b.calls.map((c) => c.url), [`${API}${f.path}?${OLD_FROM}&count=100&skip=500`]);
    assertEquals(two.events.length, 50);
    const ids = [...one.events, ...two.events].map((e) => (e as { id: string }).id);
    assertEquals(new Set(ids).size, 550);
    assertEquals((two.nextState as { resume?: unknown }).resume, undefined);
    assertEquals((two.nextState as { cursor: number }).cursor, CURSOR); // moved to the drain's start
  });

  test(`${f.name}: records from before the seed never fire, however many pages`, async () => {
    const seeded = await atNow(
      CURSOR,
      () => f.trigger.poll!({ ...input, state: {} }, mockCtx([page("o", PAST)]).ctx),
    );
    assertEquals(seeded.events, []);
    const x = await atNow(CURSOR + 60_000, () =>
      f.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([1, 2, 3, 4, 5].map((n) => page(`x${n}`, PAST))).ctx,
      ));
    assertEquals(x.events, []);
    const y = await atNow(
      CURSOR + 120_000,
      () => f.trigger.poll!({ ...input, state: x.nextState }, mockCtx([page("x6", PAST, 50)]).ctx),
    );
    assertEquals(y.events, []);
    const z = await atNow(CURSOR + 180_000, () =>
      f.trigger.poll!(
        { ...input, state: y.nextState },
        mockCtx([{ body: collection([rec("fresh", FUTURE)]) }]).ctx,
      ));
    assertEquals(z.events, [rec("fresh", FUTURE)]);
  });
}

// Bounded lists (brief 9.1 c): read whole, compared check to check, only added rows fire.
const lists = [
  {
    name: "new-customer",
    trigger: newCustomer,
    params: {},
    url: `${API}/customers?count=100&skip=0`,
  },
  { name: "new-dispute", trigger: newDispute, params: {}, url: `${API}/disputes?count=100&skip=0` },
  { name: "new-item", trigger: newItem, params: {}, url: `${API}/items?count=100&skip=0` },
  { name: "new-plan", trigger: newPlan, params: {}, url: `${API}/plans?count=100&skip=0` },
  {
    name: "new-payment-link",
    trigger: newPaymentLink,
    params: {},
    url: `${API}/payment_links`,
    rows: "payment_links",
  },
  {
    name: "new-order-payment",
    trigger: newOrderPayment,
    params: { orderId: "order_1" },
    url: `${API}/orders/order_1/payments`,
  },
];

for (const c of lists) {
  const body = (ids: string[]) => ({
    body: c.rows
      ? { count: ids.length, [c.rows]: ids.map((id) => ({ id })) }
      : collection(ids.map((id) => ({ id }))),
  });
  const args = { params: c.params, subscriptionId: "sub-1" };

  test(`${c.name}: seeds, emits only a new row once, requests its list`, async () => {
    const seed = mockCtx([body(["a"])]);
    const seeded = await c.trigger.poll!({ ...args, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const run = () =>
      c.trigger.poll!({ ...args, state: seeded.nextState }, mockCtx([body(["a", "b"])]).ctx);
    const first = await run();
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(await run(), first);
  });

  if (Object.keys(c.params).length) {
    test(`${c.name}: an unset parent id is refused before any request`, async () => {
      const m = mockCtx([]);
      await assertRejects(() =>
        c.trigger.poll!({ params: {}, subscriptionId: "sub-1", state: {} }, m.ctx)
      );
      assertEquals(m.calls.length, 0);
    });
  }
}

test("new-customer: a second full page is read and compared", async () => {
  const ids = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `c${from + i}` }));
  const seed = mockCtx([{ body: collection(ids(0, 100)) }, { body: collection(ids(100, 1)) }]);
  const seeded = await newCustomer.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.map((c) => c.url), [
    `${API}/customers?count=100&skip=0`,
    `${API}/customers?count=100&skip=100`,
  ]);
  const next = await newCustomer.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: collection(ids(0, 100)) }, { body: collection(ids(100, 2)) }]).ctx,
  );
  assertEquals(next.events, [{ id: "c101" }]);
});

// 5000-row snapshot cap: 50 full pages and then an empty one is allowed, a 51st page with rows is not.
test("new-customer: 5000 rows exactly compare; a 5001st row is refused", async () => {
  const full = (n: number) => ({
    body: collection(Array.from({ length: 100 }, (_, i) => ({ id: `c${n}-${i}` }))),
  });
  const exact = mockCtx([...Array.from({ length: 50 }, (_, n) => full(n)), {
    body: collection([]),
  }]);
  const ok = await newCustomer.poll!({ ...input, state: {} }, exact.ctx);
  assertEquals(ok.events, []);
  assertEquals(exact.calls.length, 51);
  const over = mockCtx([
    ...Array.from({ length: 50 }, (_, n) => full(n)),
    { body: collection([{ id: "extra" }]) },
  ]);
  await assertRejects(() => newCustomer.poll!({ ...input, state: {} }, over.ctx));
});

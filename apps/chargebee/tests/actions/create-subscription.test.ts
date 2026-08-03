import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, formObject, formPairs, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-subscription.ts";

const ok = { status: 200, body: { subscription: { id: "sub_1" } } };
const items = [{ item_price_id: "basic-USD", quantity: 1 }];

Deno.test("create-subscription: is a non-idempotent perform action", () => {
  assertEquals(action.key, "create-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "subscription");
  // A retry creates a SECOND subscription for the same customer.
  assertEquals(action.idempotent, false);
});

Deno.test("create-subscription: POSTs to /customers/{id}/subscription_for_items", async () => {
  // The Product Catalog 2.0 route. `POST /subscriptions` is the PC 1.0 route
  // and does not exist here; nor does `/subscriptions/create_for_items`.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ customerId: "cust_1", subscriptionItems: items }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v2/customers/cust_1/subscription_for_items",
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("create-subscription: reproduces Chargebee's own multi-item wire sample", async () => {
  // -d "subscription_items[item_price_id][0]"="basic-USD"
  // -d "subscription_items[billing_cycles][0]"=2
  // -d "subscription_items[quantity][0]"=1
  // -d "subscription_items[item_price_id][1]"="day-pass-USD"
  // -d "subscription_items[unit_price][1]"=100
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "__test__8asz8Ru9WhHOJO",
    subscriptionItems: [
      { item_price_id: "basic-USD", billing_cycles: 2, quantity: 1 },
      { item_price_id: "day-pass-USD", unit_price: 100 },
    ],
  }, connected(ctx));

  assertEquals(formPairs(calls[0].body), [
    ["subscription_items[item_price_id][0]", "basic-USD"],
    ["subscription_items[item_price_id][1]", "day-pass-USD"],
    ["subscription_items[billing_cycles][0]", "2"],
    ["subscription_items[quantity][0]", "1"],
    ["subscription_items[unit_price][1]", "100"],
  ]);
});

Deno.test("create-subscription: a hole in one column does not re-pair the others", async () => {
  // The single most dangerous encoding bug available here: re-indexing would
  // charge row 1's unit price against row 0's item price.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "c",
    subscriptionItems: [
      { item_price_id: "a" },
      { item_price_id: "b", unit_price: 999 },
    ],
  }, connected(ctx));
  const body = formObject(calls[0].body);
  assertEquals(body["subscription_items[item_price_id][1]"], "b");
  assertEquals(body["subscription_items[unit_price][1]"], "999");
  assertEquals(body["subscription_items[unit_price][0]"], undefined);
});

Deno.test("create-subscription: accepts the item list as a JSON string or a single object", async () => {
  for (
    const value of [
      '[{"item_price_id":"basic-USD"}]',
      { item_price_id: "basic-USD" },
    ]
  ) {
    const { ctx, calls } = mockCtx([ok]);
    await action.execute({ customerId: "c", subscriptionItems: value }, connected(ctx));
    assertEquals(
      formObject(calls[0].body)["subscription_items[item_price_id][0]"],
      "basic-USD",
    );
  }
});

Deno.test("create-subscription: refuses to create a subscription with no item prices", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ customerId: "c", subscriptionItems: [] }, connected(ctx));
    },
    Error,
    "at least one item price",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-subscription: rejects a malformed item list rather than sending an empty one", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ customerId: "c", subscriptionItems: "{oops" }, connected(ctx));
    },
    Error,
    "not valid JSON",
  );
  await assertRejects(
    async () => {
      await action.execute({ customerId: "c", subscriptionItems: [1, 2] }, connected(ctx));
    },
    Error,
    "array of objects",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-subscription: coupon ids go out indexed", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "c",
    subscriptionItems: items,
    couponIds: ["EARLYBIRD", "LOYALTY"],
  }, connected(ctx));
  const body = formObject(calls[0].body);
  assertEquals(body["coupon_ids[0]"], "EARLYBIRD");
  assertEquals(body["coupon_ids[1]"], "LOYALTY");
});

Deno.test("create-subscription: coupon ids also accept a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "c",
    subscriptionItems: items,
    couponIds: "EARLYBIRD, LOYALTY",
  }, connected(ctx));
  const body = formObject(calls[0].body);
  assertEquals(body["coupon_ids[0]"], "EARLYBIRD");
  assertEquals(body["coupon_ids[1]"], "LOYALTY");
});

Deno.test("create-subscription: maps the scalar options onto their snake_case names", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "c",
    subscriptionItems: items,
    id: "sub_custom",
    startDate: 1735689600,
    billingCycles: 12,
    poNumber: "PO-1",
    autoCollection: "on",
    paymentSourceId: "pm_1",
    invoiceImmediately: true,
    invoiceNotes: "hello",
  }, connected(ctx));

  const body = formObject(calls[0].body);
  assertEquals(body.id, "sub_custom");
  assertEquals(body.start_date, "1735689600");
  assertEquals(body.billing_cycles, "12");
  assertEquals(body.po_number, "PO-1");
  assertEquals(body.auto_collection, "on");
  assertEquals(body.payment_source_id, "pm_1");
  assertEquals(body.invoice_immediately, "true");
  assertEquals(body.invoice_notes, "hello");
});

Deno.test("create-subscription: trial_end 0 survives — it means `skip the trial`", async () => {
  // Dropping a falsy value here would silently grant a trial the caller
  // explicitly waived.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute(
    { customerId: "c", subscriptionItems: items, trialEnd: 0 },
    connected(ctx),
  );
  assertEquals(formObject(calls[0].body).trial_end, "0");
});

Deno.test("create-subscription: the hint states that prices are in the smallest currency unit", () => {
  const p = (action.params ?? []).find((p) => p.key === "subscriptionItems")!;
  assert(/smallest unit/i.test(p.hint ?? ""), "the money convention must be stated");
  assertEquals(p.required, true);
});

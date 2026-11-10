import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { list, mockCtx } from "../_helpers.ts";
import chargeback from "../../triggers/new-chargeback.ts";
import customerPayment from "../../triggers/new-customer-payment.ts";
import refund from "../../triggers/new-refund.ts";
import subscription from "../../triggers/new-subscription.ts";

const item = (id: string) => ({ id });

async function pollCase(
  trigger: typeof chargeback,
  resource: string,
  url: string,
  params: Record<string, string> = {},
) {
  const input = { params, state: {}, subscriptionId: "sub" };
  const seededCtx = mockCtx([{ body: list(resource, [item("old")]) }]);
  const seeded = await trigger.poll!(input, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(seededCtx.calls[0].url, url);

  const page = [item("new"), item("old")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: list(resource, page) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: list(resource, page) }]).ctx,
  );
  assertEquals(first.events, [item("new")]);
  assertEquals(retry, first);
}

test("new-chargeback seeds, emits, retries, and requests descending order", () =>
  pollCase(chargeback, "chargebacks", "https://api.mollie.com/v2/chargebacks?limit=100&sort=desc"));

test("new-refund seeds, emits, retries, and requests descending order", () =>
  pollCase(refund, "refunds", "https://api.mollie.com/v2/refunds?limit=100&sort=desc"));

test("new-customer-payment uses the selected customer and descending order", () =>
  pollCase(
    customerPayment,
    "payments",
    "https://api.mollie.com/v2/customers/cst_test/payments?limit=100&sort=desc",
    { customerId: "cst_test" },
  ));

test("new-subscription uses the selected customer and descending order", () =>
  pollCase(
    subscription,
    "subscriptions",
    "https://api.mollie.com/v2/customers/cst_test/subscriptions?limit=100&sort=desc",
    { customerId: "cst_test" },
  ));

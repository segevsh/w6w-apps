import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
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

import mandate from "../../triggers/new-mandate.ts";
import payment from "../../triggers/new-payment.ts";
import paymentLink from "../../triggers/new-payment-link.ts";
import subscriptionAll from "../../triggers/new-subscription-all.ts";

test("new-payment seeds, emits, retries, and requests descending order", () =>
  pollCase(payment, "payments", "https://api.mollie.com/v2/payments?limit=100&sort=desc"));

test("new-mandate uses the selected customer and descending order", async () => {
  assertEquals(mandate.params!.map((p) => [p.key, p.required]), [["customerId", true]]);
  await pollCase(
    mandate,
    "mandates",
    "https://api.mollie.com/v2/customers/cst_test/mandates?limit=100&sort=desc",
    { customerId: "cst_test" },
  );
});

const dated = (id: string, createdAt: string) => ({ id, createdAt });
const NEWER = "2026-11-10T10:00:00+00:00";
const OLDER = "2026-11-09T10:00:00+00:00";

async function guardedCase(
  trigger: typeof paymentLink,
  resource: string,
  url: string,
) {
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seededCtx = mockCtx([{ body: list(resource, [dated("old", OLDER)]) }]);
  const seeded = await trigger.poll!(input, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededCtx.calls[0].url, url);

  // Descending page (newest first): emits the unseen record, and a retry is identical.
  const page = [dated("new", NEWER), dated("old", OLDER)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: list(resource, page) }]).ctx,
  );
  assertEquals(first.events, [dated("new", NEWER)]);

  // Ascending page (oldest first): throws on seed and on a seeded check, never emits.
  const ascending = [dated("old", OLDER), dated("new", NEWER)];
  await assertRejects(
    () => trigger.poll!(input, mockCtx([{ body: list(resource, ascending) }]).ctx),
    Error,
    "not newest-first",
  );
  await assertRejects(
    () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: list(resource, ascending) }]).ctx,
      ),
    Error,
    "not newest-first",
  );

  // Order that cannot be read is also refused.
  await assertRejects(
    () => trigger.poll!(input, mockCtx([{ body: list(resource, [item("a"), item("b")]) }]).ctx),
    Error,
    "createdAt",
  );
}

test("new-payment-link emits from a descending page and throws on an ascending one", () =>
  guardedCase(paymentLink, "payment_links", "https://api.mollie.com/v2/payment-links?limit=100"));

test("new-subscription-all needs no customer, lists account-wide, and guards order", async () => {
  assertEquals(subscriptionAll.params ?? [], []);
  await guardedCase(
    subscriptionAll,
    "subscriptions",
    "https://api.mollie.com/v2/subscriptions?limit=100",
  );
});

test("new-customer-payment and new-subscription expose only the customerId param", () => {
  assertEquals(customerPayment.params!.map((p) => p.key), ["customerId"]);
  assertEquals(subscription.params!.map((p) => p.key), ["customerId"]);
});

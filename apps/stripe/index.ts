/**
 * Stripe — w6w app, seeded from n8n's `Stripe` node.
 *
 * n8n's node predates most of Stripe's current surface: it exposes charge,
 * customerCard, source and token, which the API has since superseded. This
 * port keeps the parts that are still current (customer, charge reads,
 * balance) and adds what a payments workflow actually needs today —
 * PaymentIntents (which handle SCA / 3-D Secure, unlike raw Charges), refunds,
 * invoices, subscriptions and the product/price catalogue.
 *
 * Two Stripe-specific mechanics worth knowing when reading these actions:
 *
 *   - **Everything is form-encoded.** Stripe does not accept JSON; nested
 *     values use bracket notation (`items[0][price]=price_x`). `lib/client.ts`
 *     does the flattening.
 *   - **Writes carry an Idempotency-Key.** The client sends
 *     `ctx.invocation.invocationId` as Stripe's `Idempotency-Key` header, so a
 *     retried invocation replays the original response instead of charging a
 *     customer twice. That is why the write actions declare `idempotent: true`.
 *
 * Deliberately absent: the webhook trigger (a Trigger, not an Action — which
 * is also why n8n's `signatureSecret` credential field is not collected), and
 * Stripe Connect's account/transfer surface.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerGetMany from "./actions/customer-get-many.ts";
import customerSearch from "./actions/customer-search.ts";
import chargeGet from "./actions/charge-get.ts";
import chargeGetMany from "./actions/charge-get-many.ts";
import paymentIntentCreate from "./actions/payment-intent-create.ts";
import paymentIntentGet from "./actions/payment-intent-get.ts";
import paymentIntentCapture from "./actions/payment-intent-capture.ts";
import paymentIntentCancel from "./actions/payment-intent-cancel.ts";
import refundCreate from "./actions/refund-create.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceFinalize from "./actions/invoice-finalize.ts";
import invoicePay from "./actions/invoice-pay.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import productCreate from "./actions/product-create.ts";
import priceCreate from "./actions/price-create.ts";
import balanceGet from "./actions/balance-get.ts";

export default {
  actions: [
    // customer
    customerCreate,
    customerGet,
    customerUpdate,
    customerDelete,
    customerGetMany,
    customerSearch,
    // charge
    chargeGet,
    chargeGetMany,
    // payment intent
    paymentIntentCreate,
    paymentIntentGet,
    paymentIntentCapture,
    paymentIntentCancel,
    // refund
    refundCreate,
    // invoice
    invoiceCreate,
    invoiceGet,
    invoiceFinalize,
    invoicePay,
    // subscription
    subscriptionCreate,
    subscriptionGet,
    subscriptionCancel,
    // catalogue
    productCreate,
    priceCreate,
    // balance
    balanceGet,
  ],
  auth: [apiKey],
} satisfies AppDefinition;

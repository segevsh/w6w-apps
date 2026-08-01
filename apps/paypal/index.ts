/**
 * PayPal — w6w app, grounded in n8n's `PayPal` node (payouts only) and
 * PayPal's own REST API docs (developer.paypal.com), since n8n's port covers
 * a much narrower slice of the API than this one does.
 *
 * n8n's `PayPal` node exposes only the Payout/Payout-Item resources and
 * authenticates via a credential test that re-runs the `client_credentials`
 * grant. This port keeps that auth pattern (see `auth/client-credentials.ts`,
 * modelled on Zoom's Server-to-Server auth) but widens the surface to
 * PayPal's most commonly automated operations: Checkout Orders, captured
 * Payments, Invoicing, Transaction Search, and Payouts.
 *
 * PayPal issues one OAuth2 access token per app via
 * `POST /v1/oauth2/token` (HTTP Basic `clientId:clientSecret`,
 * `grant_type=client_credentials`) — no browser round-trip, so it works in
 * scheduled and background runs. The only per-connection choice is which
 * host to call: `api-m.paypal.com` (live) or `api-m.sandbox.paypal.com`
 * (sandbox), toggled by the `sandbox` Auth field and recorded on the
 * Connection's `display` by `afterConnect` — `lib/client.ts` reads it from
 * there, the same pattern Zendesk uses for its per-account subdomain.
 *
 * Deliberately absent: PayPal Subscriptions, Disputes, and the webhook
 * trigger (a Trigger, not an Action).
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import orderCreate from "./actions/order-create.ts";
import orderGet from "./actions/order-get.ts";
import orderCapture from "./actions/order-capture.ts";

import paymentCaptureGet from "./actions/payment-capture-get.ts";
import paymentRefund from "./actions/payment-refund.ts";

import invoiceCreate from "./actions/invoice-create.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceSend from "./actions/invoice-send.ts";

import transactionList from "./actions/transaction-list.ts";

import payoutCreate from "./actions/payout-create.ts";
import payoutGet from "./actions/payout-get.ts";
import payoutItemCancel from "./actions/payout-item-cancel.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // order
    orderCreate,
    orderGet,
    orderCapture,
    // payment
    paymentCaptureGet,
    paymentRefund,
    // invoice
    invoiceCreate,
    invoiceGet,
    invoiceList,
    invoiceSend,
    // transaction
    transactionList,
    // payout
    payoutCreate,
    payoutGet,
    payoutItemCancel,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;

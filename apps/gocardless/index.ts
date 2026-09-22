/**
 * GoCardless — bank debits (Direct Debit, SEPA, ACH and Pay by Bank) over the
 * GoCardless REST API.
 *
 * Every path, verb, query parameter, body field and error code in this app was
 * verified on 2026-09-22 against GoCardless's own OpenAPI 3.1 document
 * (`https://docs.gocardless.com/openapi-schema-public.json`, `info.version`
 * `2015-07-06`) plus the prose reference at
 * `https://docs.gocardless.com/docs/api-reference/*`. Nothing here came from a
 * third-party integration directory or a sibling app in this pack.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two environments, and the token does not say which** (`lib/client.ts`,
 *     `auth/access-token.ts`). Live (`api.gocardless.com`) and sandbox
 *     (`api-sandbox.gocardless.com`) are separate accounts with separate tokens,
 *     and a GoCardless token is a bare opaque hex string with no environment
 *     marker. So the environment is an explicit Auth field and `sign` rewrites
 *     the request's hostname from it — the mechanic Paddle uses for a
 *     key-derived host, applied to a user's choice because there is nothing in
 *     the key to derive it from.
 *  2. **Every request needs two headers, not one** (`auth/access-token.ts`).
 *     `Authorization: Bearer …` *and* `GoCardless-Version: 2015-07-06`, which is
 *     required uniformly and answers `400 missing_version_header` when absent.
 *     Both are stamped in `sign` rather than repeated in sixteen actions, so no
 *     action can forget one.
 *  3. **Errors are classified by body, never by status** (`lib/client.ts`). Every
 *     failure is `{"error": {type, code, message, errors: [{reason|field}]}}`,
 *     and "the token is wrong" versus "no Authorization header arrived" versus
 *     "this endpoint is restricted" are three different fixes behind the same
 *     401/403. The formatter renders the vendor's own code verbatim.
 *  4. **The envelope is the resource's plural name, not `data`**
 *     (`lib/client.ts`). `POST /customers` sends `{"customers": {…}}` and single
 *     reads answer the same way; lists add `meta.cursors`, which every `list-*`
 *     action surfaces so a workflow can page.
 *
 * What is deliberately absent — mandate creation, Billing Requests / Billing
 * Request Flows / payer and bank authorisations, creditor management and webhook
 * signature verification — is set out with its reasons in the README.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import listCustomers from "./actions/list-customers.ts";
import getCustomer from "./actions/get-customer.ts";
import createCustomer from "./actions/create-customer.ts";

import listMandates from "./actions/list-mandates.ts";
import getMandate from "./actions/get-mandate.ts";
import cancelMandate from "./actions/cancel-mandate.ts";

import listPayments from "./actions/list-payments.ts";
import getPayment from "./actions/get-payment.ts";
import createPayment from "./actions/create-payment.ts";
import cancelPayment from "./actions/cancel-payment.ts";

import listSubscriptions from "./actions/list-subscriptions.ts";
import createSubscription from "./actions/create-subscription.ts";
import cancelSubscription from "./actions/cancel-subscription.ts";

import listPayouts from "./actions/list-payouts.ts";
import listRefunds from "./actions/list-refunds.ts";
import createRefund from "./actions/create-refund.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Customers
    listCustomers,
    getCustomer,
    createCustomer,
    // Mandates — read, list and cancel only; creation is out of scope.
    listMandates,
    getMandate,
    cancelMandate,
    // Payments
    listPayments,
    getPayment,
    createPayment,
    cancelPayment,
    // Subscriptions
    listSubscriptions,
    createSubscription,
    cancelSubscription,
    // Money in and money back out
    listPayouts,
    listRefunds,
    createRefund,
  ],
  // One method: a dashboard-issued access token plus the environment it belongs
  // to. GoCardless publishes no OAuth surface a third-party app can use without
  // a partner agreement, and no scope model to request — permissions are a
  // property of the account, not of the token.
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

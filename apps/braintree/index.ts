import type { AppDefinition } from "@w6w/types";
import apiKeys from "./auth/api-keys.ts";

import ping from "./actions/ping.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionSearch from "./actions/transaction-search.ts";
import transactionCharge from "./actions/transaction-charge.ts";
import transactionAuthorize from "./actions/transaction-authorize.ts";
import transactionCapture from "./actions/transaction-capture.ts";
import transactionPartialCapture from "./actions/transaction-partial-capture.ts";
import transactionVoid from "./actions/transaction-void.ts";
import transactionRefund from "./actions/transaction-refund.ts";
import transactionReverse from "./actions/transaction-reverse.ts";
import paymentMethodGet from "./actions/payment-method-get.ts";
import paymentMethodVault from "./actions/payment-method-vault.ts";
import paymentMethodDelete from "./actions/payment-method-delete.ts";
import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerSearch from "./actions/customer-search.ts";
import clientTokenCreate from "./actions/client-token-create.ts";
import idFromLegacy from "./actions/id-from-legacy.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Braintree — core payment operations over the GraphQL API (`schema.graphql` in
 * github.com/braintree/graphql-api). Subscriptions/recurring billing, disputes, in-store
 * readers, 3-D Secure lookups and the per-type tokenize/verify mutations are not covered;
 * see the README.
 */
export default {
  actions: [
    ping,
    // Transactions
    transactionCharge,
    transactionAuthorize,
    transactionCapture,
    transactionPartialCapture,
    transactionVoid,
    transactionRefund,
    transactionReverse,
    transactionGet,
    transactionSearch,
    // Payment methods
    paymentMethodVault,
    paymentMethodGet,
    paymentMethodDelete,
    // Customers
    customerCreate,
    customerGet,
    customerUpdate,
    customerDelete,
    customerSearch,
    // Utilities
    clientTokenCreate,
    idFromLegacy,
  ],
  auth: [apiKeys],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;

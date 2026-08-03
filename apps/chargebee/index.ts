import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listCustomers from "./actions/list-customers.ts";
import getCustomer from "./actions/get-customer.ts";
import createCustomer from "./actions/create-customer.ts";
import updateCustomer from "./actions/update-customer.ts";

import listSubscriptions from "./actions/list-subscriptions.ts";
import getSubscription from "./actions/get-subscription.ts";
import createSubscription from "./actions/create-subscription.ts";
import cancelSubscription from "./actions/cancel-subscription.ts";
import pauseSubscription from "./actions/pause-subscription.ts";
import resumeSubscription from "./actions/resume-subscription.ts";

import listInvoices from "./actions/list-invoices.ts";
import getInvoice from "./actions/get-invoice.ts";
import collectPayment from "./actions/collect-payment.ts";

import listItems from "./actions/list-items.ts";
import listItemPrices from "./actions/list-item-prices.ts";

import listPaymentSources from "./actions/list-payment-sources.ts";
import listEvents from "./actions/list-events.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Customer — the account object subscriptions and invoices hang off
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    // Subscription — the lifecycle
    listSubscriptions,
    getSubscription,
    createSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    // Invoice + payment
    listInvoices,
    getInvoice,
    collectPayment,
    // Product catalog — the id lookups Create Subscription depends on
    listItems,
    listItemPrices,
    // Payment sources and the event log
    listPaymentSources,
    listEvents,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

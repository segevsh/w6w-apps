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
import newEvent from "./triggers/new-event.ts";
import newCustomer from "./triggers/new-customer.ts";
import newOrUpdatedCustomer from "./triggers/new-or-updated-customer.ts";
import newSubscription from "./triggers/new-subscription.ts";
import newOrUpdatedSubscription from "./triggers/new-or-updated-subscription.ts";
import newInvoice from "./triggers/new-invoice.ts";
import newOrUpdatedInvoice from "./triggers/new-or-updated-invoice.ts";
import newPaymentSource from "./triggers/new-payment-source.ts";
import newOrUpdatedPaymentSource from "./triggers/new-or-updated-payment-source.ts";
import newOrUpdatedItem from "./triggers/new-or-updated-item.ts";
import newOrUpdatedItemPrice from "./triggers/new-or-updated-item-price.ts";

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
  triggers: [
    newEvent,
    newCustomer,
    newOrUpdatedCustomer,
    newSubscription,
    newOrUpdatedSubscription,
    newInvoice,
    newOrUpdatedInvoice,
    newPaymentSource,
    newOrUpdatedPaymentSource,
    newOrUpdatedItem,
    newOrUpdatedItemPrice,
  ],
} satisfies AppDefinition;

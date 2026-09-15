import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listAccounts from "./actions/list-accounts.ts";
import getAccount from "./actions/get-account.ts";
import createAccount from "./actions/create-account.ts";
import updateAccount from "./actions/update-account.ts";

import listSubscriptions from "./actions/list-subscriptions.ts";
import getSubscription from "./actions/get-subscription.ts";
import createSubscription from "./actions/create-subscription.ts";
import cancelSubscription from "./actions/cancel-subscription.ts";

import listPlans from "./actions/list-plans.ts";
import getPlan from "./actions/get-plan.ts";

import listInvoices from "./actions/list-invoices.ts";
import getInvoice from "./actions/get-invoice.ts";
import collectInvoice from "./actions/collect-invoice.ts";

import listTransactions from "./actions/list-transactions.ts";
import getTransaction from "./actions/get-transaction.ts";

import listCoupons from "./actions/list-coupons.ts";
import getCoupon from "./actions/get-coupon.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account — the object subscriptions and invoices hang off
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    // Subscription — the lifecycle
    listSubscriptions,
    getSubscription,
    createSubscription,
    cancelSubscription,
    // Plan — the product catalog
    listPlans,
    getPlan,
    // Invoice + payment
    listInvoices,
    getInvoice,
    collectInvoice,
    // Transaction — the payment-gateway log
    listTransactions,
    getTransaction,
    // Coupon
    listCoupons,
    getCoupon,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

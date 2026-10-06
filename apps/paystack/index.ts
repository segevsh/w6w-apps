/**
 * Paystack — payments, customers, plans, subscriptions, transfers and refunds over the REST API
 * (`api.paystack.co`). Verified 2026-10-06 against the vendor's OpenAPI document
 * (`PaystackOSS/openapi`, `dist/paystack.yaml`). See README.md for what is deliberately not
 * covered.
 */
import type { AppDefinition } from "@w6w/types";
import secretKey from "./auth/secret-key.ts";

import balanceGet from "./actions/balance-get.ts";
import bankList from "./actions/bank-list.ts";
import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import customerUpdate from "./actions/customer-update.ts";
import planCreate from "./actions/plan-create.ts";
import planList from "./actions/plan-list.ts";
import refundCreate from "./actions/refund-create.ts";
import refundList from "./actions/refund-list.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionList from "./actions/subscription-list.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionInitialize from "./actions/transaction-initialize.ts";
import transactionList from "./actions/transaction-list.ts";
import transactionVerify from "./actions/transaction-verify.ts";
import transferGet from "./actions/transfer-get.ts";
import transferInitiate from "./actions/transfer-initiate.ts";
import transferRecipientCreate from "./actions/transfer-recipient-create.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    balanceGet,
    bankList,
    customerCreate,
    customerGet,
    customerList,
    customerUpdate,
    planCreate,
    planList,
    refundCreate,
    refundList,
    subscriptionCreate,
    subscriptionGet,
    subscriptionList,
    transactionGet,
    transactionInitialize,
    transactionList,
    transactionVerify,
    transferGet,
    transferInitiate,
    transferRecipientCreate,
  ],
  auth: [secretKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

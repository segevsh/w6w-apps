/**
 * SamCart — orders, charges, customers, products, refunds and subscriptions over
 * the SamCart Public API (`api.samcart.com/v1`).
 *
 * Every path, verb, parameter and body field was read from SamCart's own OpenAPI
 * document (`developer.samcart.com/specs/openapi.yaml`, fetched 2026-10-05). Nothing
 * was exercised against a live account.
 *
 * What shaped the design:
 *
 *  1. **Auth is a header, not a bearer.** The key goes in `sc-api`; an `Accept:
 *     application/json` header is also required, and the client always sends it.
 *  2. **Two list shapes.** Bulk lists answer `{data, pagination}` with offset
 *     paging (`offset` is a record id, `dir` is next/prev); per-resource lists
 *     answer a bare array. Both are returned as `{data, ...}`.
 *  3. **Money-moving actions are not idempotent** (`order-add-product`,
 *     `order-batch-add-product`, `charge-refund`); nothing in the API dedupes a repeat.
 *  4. **Some documented responses have no schema** (add-to-order, batch add and its
 *     status), so those actions return the body as `response` untouched.
 *
 * Nothing in the document is deprecated.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderChargeList from "./actions/order-charge-list.ts";
import orderCustomerGet from "./actions/order-customer-get.ts";
import orderSubscriptionList from "./actions/order-subscription-list.ts";
import orderUpdateCustomField from "./actions/order-update-custom-field.ts";
import orderAddProduct from "./actions/order-add-product.ts";
import orderBatchAddProduct from "./actions/order-batch-add-product.ts";
import orderBatchAddStatus from "./actions/order-batch-add-status.ts";
import chargeList from "./actions/charge-list.ts";
import chargeGet from "./actions/charge-get.ts";
import chargeRefundList from "./actions/charge-refund-list.ts";
import chargeRefundGet from "./actions/charge-refund-get.ts";
import failedChargeList from "./actions/failed-charge-list.ts";
import failedChargeGet from "./actions/failed-charge-get.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerAddressList from "./actions/customer-address-list.ts";
import customerChargeList from "./actions/customer-charge-list.ts";
import customerOrderList from "./actions/customer-order-list.ts";
import customerSubscriptionList from "./actions/customer-subscription-list.ts";
import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productOrderList from "./actions/product-order-list.ts";
import funnelOrderList from "./actions/funnel-order-list.ts";
import upsellOrderList from "./actions/upsell-order-list.ts";
import refundList from "./actions/refund-list.ts";
import refundGet from "./actions/refund-get.ts";
import chargeRefund from "./actions/charge-refund.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionChargeList from "./actions/subscription-charge-list.ts";
import subscriptionCustomerGet from "./actions/subscription-customer-get.ts";
import subscriptionHistoryList from "./actions/subscription-history-list.ts";
import subscriptionPlanGet from "./actions/subscription-plan-get.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionScheduleCancel from "./actions/subscription-schedule-cancel.ts";
import subscriptionUpdateRebillingDate from "./actions/subscription-update-rebilling-date.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    orderList,
    orderGet,
    orderChargeList,
    orderCustomerGet,
    orderSubscriptionList,
    orderUpdateCustomField,
    orderAddProduct,
    orderBatchAddProduct,
    orderBatchAddStatus,
    chargeList,
    chargeGet,
    chargeRefundList,
    chargeRefundGet,
    failedChargeList,
    failedChargeGet,
    customerList,
    customerGet,
    customerAddressList,
    customerChargeList,
    customerOrderList,
    customerSubscriptionList,
    productList,
    productGet,
    productOrderList,
    funnelOrderList,
    upsellOrderList,
    refundList,
    refundGet,
    chargeRefund,
    subscriptionList,
    subscriptionGet,
    subscriptionChargeList,
    subscriptionCustomerGet,
    subscriptionHistoryList,
    subscriptionPlanGet,
    subscriptionCancel,
    subscriptionScheduleCancel,
    subscriptionUpdateRebillingDate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

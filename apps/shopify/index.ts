/**
 * Shopify — w6w port of n8n's `Shopify` node (Admin REST API 2024-07).
 *
 * n8n's node covers only order and product. This adds customer, inventory,
 * location and shop, which is what a store-operations workflow actually needs.
 *
 * Three Shopify-specific mechanics shape the code:
 *
 *   - **Per-store hosts.** Every store is `acme.myshopify.com`, so
 *     `w6w.network.allow` declares `*.myshopify.com` and the store handle is an
 *     Auth field recorded on the connection's `display` by `afterConnect` —
 *     never an Action param.
 *   - **Auth is not an Authorization header.** The Admin API reads
 *     `X-Shopify-Access-Token`, which is why the auth method is `custom`.
 *   - **Pagination lives in a `Link` header.** `lib/client.ts` extracts the
 *     cursor into `nextPageInfo` so workflows never parse headers. Note that
 *     once a cursor is supplied Shopify REJECTS the other filters, so the list
 *     actions drop them when paging.
 *
 * Triggers (`lib/triggers.ts`) register REST webhook subscriptions and verify each delivery's
 * `X-Shopify-Hmac-Sha256` with the app's client secret (a trigger parameter: it is not in the
 * access token). Deliberately absent: the GraphQL Admin API, a separate surface from this REST one.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import productCreate from "./actions/product-create.ts";
import productGet from "./actions/product-get.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import productGetMany from "./actions/product-get-many.ts";

import orderGet from "./actions/order-get.ts";
import orderGetMany from "./actions/order-get-many.ts";
import orderUpdate from "./actions/order-update.ts";
import orderClose from "./actions/order-close.ts";
import orderCancel from "./actions/order-cancel.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerSearch from "./actions/customer-search.ts";
import customerGetOrders from "./actions/customer-get-orders.ts";

import inventoryLevelSet from "./actions/inventory-level-set.ts";
import locationGetMany from "./actions/location-get-many.ts";
import shopGet from "./actions/shop-get.ts";
import orderCreatedTrigger from "./triggers/order-created.ts";
import orderPaidTrigger from "./triggers/order-paid.ts";
import orderUpdatedTrigger from "./triggers/order-updated.ts";
import orderCancelledTrigger from "./triggers/order-cancelled.ts";
import orderFulfilledTrigger from "./triggers/order-fulfilled.ts";
import customerCreatedTrigger from "./triggers/customer-created.ts";
import productCreatedTrigger from "./triggers/product-created.ts";
import productUpdatedTrigger from "./triggers/product-updated.ts";
import refundCreatedTrigger from "./triggers/refund-created.ts";
import customerUpdatedTrigger from "./triggers/customer-updated.ts";
import customerDeletedTrigger from "./triggers/customer-deleted.ts";
import orderDeletedTrigger from "./triggers/order-deleted.ts";
import productDeletedTrigger from "./triggers/product-deleted.ts";
import inventoryLevelUpdatedTrigger from "./triggers/inventory-level-updated.ts";
import locationCreatedTrigger from "./triggers/location-created.ts";
import locationUpdatedTrigger from "./triggers/location-updated.ts";
import locationDeletedTrigger from "./triggers/location-deleted.ts";
import eventTrigger from "./triggers/event.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import store from "./health/store.ts";

export default {
  actions: [
    // product
    productCreate,
    productGet,
    productUpdate,
    productDelete,
    productGetMany,
    // order
    orderGet,
    orderGetMany,
    orderUpdate,
    orderClose,
    orderCancel,
    // customer
    customerCreate,
    customerGet,
    customerUpdate,
    customerSearch,
    customerGetOrders,
    // inventory / store
    inventoryLevelSet,
    locationGetMany,
    shopGet,
  ],
  triggers: [
    orderCreatedTrigger,
    orderPaidTrigger,
    orderUpdatedTrigger,
    orderCancelledTrigger,
    orderFulfilledTrigger,
    customerCreatedTrigger,
    productCreatedTrigger,
    productUpdatedTrigger,
    refundCreatedTrigger,
    customerUpdatedTrigger,
    customerDeletedTrigger,
    orderDeletedTrigger,
    productDeletedTrigger,
    inventoryLevelUpdatedTrigger,
    locationCreatedTrigger,
    locationUpdatedTrigger,
    locationDeletedTrigger,
    eventTrigger,
  ],
  auth: [accessToken],
  healthChecks: [service, quota, store],
} satisfies AppDefinition;

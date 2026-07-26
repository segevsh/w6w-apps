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
 * Deliberately absent: the webhook trigger (a Trigger, not an Action), and the
 * GraphQL Admin API, which is a separate surface from this REST one.
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
  auth: [accessToken],
  healthChecks: [service, quota, store],
} satisfies AppDefinition;

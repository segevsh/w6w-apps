/**
 * BigCommerce — the hosted commerce platform: manage a store's catalog, orders,
 * customers, carts, inventory, price lists and webhooks over the **REST
 * Management API** (`api.bigcommerce.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against BigCommerce's own machine-readable OpenAPI 3.1
 * documents — 78 of them, served one per API family from
 * `docs.bigcommerce.com/openapi/` and indexed at
 * `docs.bigcommerce.com/docs/rest-catalog/openapi.json` — plus the prose
 * reference at `docs.bigcommerce.com/developer` and live probes against
 * `api.bigcommerce.com` and `status.bigcommerce.com`. Nothing came from a
 * third-party integration directory, and nothing came from
 * `github.com/bigcommerce/api-specs`, which GitHub reports as **archived** with
 * its last push on 2024-01-09.
 *
 * ## Scope: REST Management only
 *
 * BigCommerce ships several API families. This app implements exactly one.
 *
 *  - **REST Management** (`/stores/{hash}/v2|v3/…`, `X-Auth-Token`) — implemented.
 *  - **REST Storefront** (`/api/storefront/…` on the store's own domain) —
 *    excluded. It authenticates by same-origin session cookie, not by a token, so
 *    a server-side workflow cannot call it at all.
 *  - **GraphQL Storefront**, **GraphQL Admin**, **GraphQL Account** — excluded.
 *    Different transports and, for the Account API, a different *kind* of API
 *    account whose token reaches every store on the account.
 *  - **B2B Edition REST** — excluded. Different host (`api-b2b.bigcommerce.com`)
 *    and an extra `X-Store-Hash` header; adding it would mean a second egress
 *    host for a product most stores do not have.
 *
 * Within REST Management, the deliberate exclusions are content and themes
 * (pages, widgets, scripts, email templates), payments and payment processing,
 * tax and shipping provider integrations, promotions, channels and sites, store
 * settings, and metafields across all of them. The 38 actions here are the
 * commerce core: sell, fulfil, and keep the catalog straight.
 *
 * ## The four findings that shaped the design, each documented where it matters
 *
 * 1. **v2 is not "the old one"** (`actions/order-list.ts`, `actions/store-get.ts`).
 *    Order CRUD exists *only* at `/v2/orders`; "Orders V3" is transactions and
 *    refunds. `/v2/store` has no v3 replacement either — "Store Information V3"
 *    is metafields. Both are absent from the vendor's Deprecations and Sunsets
 *    page, which *does* list `/v2/products`, `/v2/customers`, `/v2/categories`
 *    and `/v2/brands`. Which version is current is per-resource, and the version
 *    number does not tell you.
 * 2. **A deprecation the machine-readable spec omits**
 *    (`actions/category-list.ts`). Not one operation in the twenty documents this
 *    app was built from sets `deprecated: true` — including
 *    `/v3/catalog/categories`, which the Deprecations page deprecates in favour
 *    of the Category Trees endpoints. A client generated from the spec alone
 *    would have shipped the dead path.
 * 3. **Four causes, one status code** (`lib/client.ts`, `auth/access-token.ts`).
 *    A missing `X-Auth-Token`, an empty one and a wrong one are all `401`, and
 *    only the *body* tells them apart (`text/plain` prose versus a JSON error
 *    object). A wrong store hash is a `403`, per the vendor's own troubleshooting
 *    table, and is indistinguishable from a missing OAuth scope.
 * 4. **An unsigned probe proves the route, never the store** (`health/api.ts`).
 *    BigCommerce resolves the route *before* authenticating — a real path answers
 *    `401 X-Auth-Token header is required` while a fake one answers
 *    `404 The route is not found` — but it authenticates *before* resolving the
 *    store, so a nonexistent store hash still 401s. Every one of the 39 routes
 *    this app calls was verified against the live API that way, without a
 *    credential; none of those checks says anything about a store.
 *
 * Two response envelopes coexist and neither is wrong: v3 answers
 * `{"data": …, "meta": {"pagination": …}}`, v2 answers the resource bare with no
 * pagination metadata at all. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import catalogSummaryGet from "./actions/catalog-summary-get.ts";
import variantList from "./actions/variant-list.ts";
import variantGet from "./actions/variant-get.ts";
import variantUpdate from "./actions/variant-update.ts";
import brandList from "./actions/brand-list.ts";
import categoryList from "./actions/category-list.ts";
import categoryTreeList from "./actions/category-tree-list.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderCount from "./actions/order-count.ts";
import orderCreate from "./actions/order-create.ts";
import orderUpdate from "./actions/order-update.ts";
import orderProductList from "./actions/order-product-list.ts";
import orderShippingAddressList from "./actions/order-shipping-address-list.ts";
import orderShipmentCreate from "./actions/order-shipment-create.ts";
import orderStatusList from "./actions/order-status-list.ts";
import orderTransactionList from "./actions/order-transaction-list.ts";

import customerList from "./actions/customer-list.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerAddressList from "./actions/customer-address-list.ts";

import cartGet from "./actions/cart-get.ts";
import cartCreate from "./actions/cart-create.ts";
import abandonedCartGet from "./actions/abandoned-cart-get.ts";

import inventoryItemList from "./actions/inventory-item-list.ts";
import inventoryLocationList from "./actions/inventory-location-list.ts";
import inventoryAdjustRelative from "./actions/inventory-adjust-relative.ts";

import priceListList from "./actions/price-list-list.ts";
import priceListRecordList from "./actions/price-list-record-list.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import storeGet from "./actions/store-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import store from "./health/store.ts";
import planLimits from "./health/plan-limits.ts";

export default {
  actions: [
    // Catalog (v3)
    productList,
    productGet,
    productCreate,
    productUpdate,
    productDelete,
    catalogSummaryGet,
    variantList,
    variantGet,
    variantUpdate,
    brandList,
    categoryList,
    categoryTreeList,
    // Orders (v2 for CRUD, v3 for transactions — see the note above)
    orderList,
    orderGet,
    orderCount,
    orderCreate,
    orderUpdate,
    orderProductList,
    orderShippingAddressList,
    orderShipmentCreate,
    orderStatusList,
    orderTransactionList,
    // Customers (v3)
    customerList,
    customerCreate,
    customerUpdate,
    customerAddressList,
    // Carts
    cartGet,
    cartCreate,
    abandonedCartGet,
    // Inventory
    inventoryItemList,
    inventoryLocationList,
    inventoryAdjustRelative,
    // Price lists
    priceListList,
    priceListRecordList,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
    // Store
    storeGet,
  ],
  // One method. BigCommerce's app-level OAuth flow is for apps installed from its
  // marketplace into a merchant's control panel — a distribution model, not a
  // second way to authenticate a request: an installed app ends up presenting the
  // very same `X-Auth-Token` header this method sends. So there is nothing a
  // second `oauth2` method here would authenticate differently.
  auth: [accessToken],
  healthChecks: [service, api, quota, store, planLimits],
} satisfies AppDefinition;

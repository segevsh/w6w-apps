/**
 * Squarespace Commerce — the merchant-side commerce APIs for **one Squarespace
 * website**: its orders, inventory, products, store pages, customer profiles and
 * transaction documents, over `https://api.squarespace.com`.
 *
 * This is deliberately **not** the Squarespace website-builder integration. The
 * Content API, the Forms API, Webhook Subscriptions, Contacts, Discounts and
 * Analytics all exist under the same docs tree and none of them is here; every
 * path in this app is one of the 21 operations on the Commerce reference pages.
 *
 * Every path, verb, query parameter, body field and enum was verified on
 * 2026-09-22 against the live reference pages under
 * `https://developers.squarespace.com/commerce-apis/*` (each bare URL
 * server-renders the full parameter tables and example bodies) plus live probes
 * against `api.squarespace.com` and the status feed. Nothing came from a
 * third-party integration directory. The operation/method/path triples were
 * re-read out of the pages' own embedded navigation data, which is how the two
 * `POST`-as-update products routes and the `store_pages` spelling were confirmed
 * rather than assumed.
 *
 * Six findings shaped the design, and each is documented where it matters:
 *
 *  1. **`User-Agent` is a required header on every request.** The docs mark it
 *     `required` on all 21 operations, with `YOUR_CUSTOM_APP_DESCRIPTION` as the
 *     placeholder. `lib/client.ts` sends a fixed value unconditionally.
 *  2. **The version segment is not uniform.** Orders, inventory, store pages,
 *     profiles and transactions are `/1.0/…`; **products are `/v2/…`**
 *     (`lib/client.ts`).
 *  3. **`Idempotency-Key` is required on create order and adjust stock
 *     quantities**, and its absence is *silent*: a repeat short-circuits to
 *     "previous operation was successful, no new changes" — a `204` with no
 *     error. The client stamps one per invocation (`actions/create-order.ts`,
 *     `actions/adjust-inventory.ts`).
 *  4. **Products updates use a Change wrapper.** Every updatable field on
 *     `POST /v2/commerce/products/{productId}` and its variant sibling is
 *     `{ "present": true, "value": … }`, so "leave unchanged" is expressible.
 *     Actions declare plain fields; `changeBody()` builds the wrapper
 *     (`actions/update-product.ts`, `actions/update-product-variant.ts`).
 *  5. **Two `paymentGatewayError` enum values are misspelled by the vendor, and
 *     both are kept verbatim**: `GATEWAY_FEE_PROCEESING_ERROR` (three E's) and
 *     `GATEWAY_DISCONNNECTED` (three N's). A matcher written against the correct
 *     spellings would never fire.
 *  6. **Create order has its own, far tighter rate limit** — 100 requests/hour
 *     per website with an API key, against the general 300/minute
 *     (`actions/create-order.ts`, README).
 *
 * Two more things a reader should know up front: the **Profiles** API is in
 * vendor-declared maintenance mode (new integrations are pointed at a Contacts
 * API this app deliberately does not implement — it is outside the Commerce
 * scope), and no quota check exists because Squarespace publishes no readable
 * rate-limit headers (`health/quota.ts`).
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import getWebsiteProfile from "./actions/get-website-profile.ts";

import listStorePages from "./actions/list-store-pages.ts";

import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import createOrder from "./actions/create-order.ts";
import fulfillOrder from "./actions/fulfill-order.ts";

import listInventory from "./actions/list-inventory.ts";
import getInventoryItems from "./actions/get-inventory-items.ts";
import adjustInventory from "./actions/adjust-inventory.ts";

import listProducts from "./actions/list-products.ts";
import getProducts from "./actions/get-products.ts";
import createProduct from "./actions/create-product.ts";
import updateProduct from "./actions/update-product.ts";
import deleteProduct from "./actions/delete-product.ts";
import createProductVariant from "./actions/create-product-variant.ts";
import updateProductVariant from "./actions/update-product-variant.ts";
import deleteProductVariant from "./actions/delete-product-variant.ts";

import listProfiles from "./actions/list-profiles.ts";
import getProfiles from "./actions/get-profiles.ts";

import listTransactions from "./actions/list-transactions.ts";
import getTransactions from "./actions/get-transactions.ts";

export default {
  actions: [
    // Website / authorization
    getWebsiteProfile,
    // Store pages
    listStorePages,
    // Orders
    listOrders,
    getOrder,
    createOrder,
    fulfillOrder,
    // Inventory
    listInventory,
    getInventoryItems,
    adjustInventory,
    // Products (v2)
    listProducts,
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductVariant,
    updateProductVariant,
    deleteProductVariant,
    // Profiles
    listProfiles,
    getProfiles,
    // Transactions
    listTransactions,
    getTransactions,
  ],
  // An API key only. OAuth exists on Squarespace solely for registered
  // Squarespace Extensions, which is not what a workflow Connection is, so the
  // key — bound to one website — is the whole authentication story here.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

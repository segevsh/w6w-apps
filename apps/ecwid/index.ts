/**
 * Ecwid by Lightspeed — the store management REST API v3 (`app.ecwid.com`).
 *
 * Four findings shaped this app, and each one has a file that exists because of
 * it:
 *
 *  1. **The store id is a path segment, not a header and not a hostname.**
 *     Every documented path is `https://app.ecwid.com/api/v3/{storeId}/…`, so
 *     the credential is a pair — a numeric store id plus a secret access token —
 *     and `network.allow` is a single fixed host. The client therefore builds
 *     `/api/v3/__storeId__<path>` and the auth `sign` hook substitutes the id
 *     along with stamping the bearer header (`lib/client.ts`, `auth/api-key.ts`).
 *  2. **A bodyless 403 is the credential being refused** (`lib/client.ts`,
 *     `auth/api-key.ts`). Live probing on 2026-09-22 against the docs' own demo
 *     store returned `403` with `content-length: 0` for both a missing and an
 *     invalid token, while a bad store id returned the documented
 *     `404 {"errorCode":"STORE_NOT_FOUND",…}`. So the `errorCode` is preferred
 *     whenever a body is present, and the status is the fallback — a documented
 *     exception to the pack's usual rule, called out in both files.
 *  3. **Three response envelopes, not one** (`lib/client.ts`). Searches answer
 *     `{total, count, offset, limit, items}`, creates answer `{id}`, and
 *     updates/deletes answer `{updateCount: 1}` / `{deleteCount: 1}`.
 *  4. **Stock moves by delta, and only by delta** (`actions/product-stock-adjust.ts`).
 *     `PUT /products/{id}/inventory` takes `quantityDelta`, which is the one
 *     stock write that is safe to make from a workflow that did not just read
 *     the product — and it is why that action is the app's only `perform` that is
 *     deliberately not idempotent alongside the creates.
 *
 * Everything this app calls is `/api/v3/{storeId}/…`. Every path, verb, query
 * parameter and body field was read from Ecwid's own documentation
 * (`docs.ecwid.com`, clean Markdown at `<page>.md`) on 2026-09-22 — nothing came
 * from a sibling app or a third-party integration directory.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import storeProfileGet from "./actions/store-profile-get.ts";
import storeProfileUpdate from "./actions/store-profile-update.ts";

import productSearch from "./actions/product-search.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import productStockAdjust from "./actions/product-stock-adjust.ts";

import categorySearch from "./actions/category-search.ts";
import categoryGet from "./actions/category-get.ts";
import categoryCreate from "./actions/category-create.ts";
import categoryUpdate from "./actions/category-update.ts";
import categoryDelete from "./actions/category-delete.ts";

import orderSearch from "./actions/order-search.ts";
import orderGet from "./actions/order-get.ts";
import orderCreate from "./actions/order-create.ts";
import orderUpdate from "./actions/order-update.ts";

import customerSearch from "./actions/customer-search.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";

import discountCouponSearch from "./actions/discount-coupon-search.ts";
import discountCouponCreate from "./actions/discount-coupon-create.ts";

export default {
  actions: [
    // store profile
    storeProfileGet,
    storeProfileUpdate,
    // products
    productSearch,
    productGet,
    productCreate,
    productUpdate,
    productDelete,
    productStockAdjust,
    // categories
    categorySearch,
    categoryGet,
    categoryCreate,
    categoryUpdate,
    categoryDelete,
    // orders
    orderSearch,
    orderGet,
    orderCreate,
    orderUpdate,
    // customers
    customerSearch,
    customerGet,
    customerCreate,
    customerUpdate,
    // discounts
    discountCouponSearch,
    discountCouponCreate,
  ],
  // Store id + secret access token, as `Authorization: Bearer <token>` with the
  // id in the path. One method, not two: an Ecwid integration that serves one
  // store (which is what a workflow connection is) has no OAuth dance to do —
  // the vendor's own quickstart says to skip it and use the custom app's secret
  // token.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

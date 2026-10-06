/**
 * Salla — the Saudi e-commerce platform — over the Merchant API at
 * `api.salla.dev/admin/v2`.
 *
 * Every path, verb, query parameter and body field here was read on 2026-10-06
 * from Salla's own OpenAPI pages (docs.salla.dev, `<page>.md`) and the guides
 * for authorization, pagination, responses and rate limiting, plus the live
 * Instatus page at `status.salla.com`. No Salla credential was available, so
 * nothing was exercised against the live API.
 *
 * Findings that shape the app:
 *
 *  1. **A 401 is not always a bad token.** A missing scope is also a 401
 *     ("The access token should have access to one of those scopes: …"), so
 *     the auth test classifies the body, not the status.
 *  2. **Refresh tokens rotate and are single-use** — a second use revokes the
 *     whole grant (access and refresh token), so refreshes must be serialised.
 *  3. **The user-info endpoint lives on `accounts.salla.sa`**, not under
 *     `/admin/v2`, and needs no resource scope — which makes it the auth probe.
 *  4. **`status.salla.com` is Instatus** (`/components.json`), not Statuspage.
 *  5. **`per_page` is capped at 60**, and the rate limit depends on the
 *     store's plan (120 / 360 / 720 per minute); customers have a separate
 *     500 per 10 minutes.
 */
import type { AppDefinition } from "@w6w/types";
import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productGetBySku from "./actions/product-get-by-sku.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import productChangeStatus from "./actions/product-change-status.ts";
import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderStatusList from "./actions/order-status-list.ts";
import orderStatusUpdate from "./actions/order-status-update.ts";
import orderHistoryList from "./actions/order-history-list.ts";
import orderHistoryCreate from "./actions/order-history-create.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import categoryList from "./actions/category-list.ts";
import categoryGet from "./actions/category-get.ts";
import categoryCreate from "./actions/category-create.ts";
import categoryUpdate from "./actions/category-update.ts";
import categoryDelete from "./actions/category-delete.ts";
import couponList from "./actions/coupon-list.ts";
import couponGet from "./actions/coupon-get.ts";
import couponCreate from "./actions/coupon-create.ts";
import couponUpdate from "./actions/coupon-update.ts";
import couponDelete from "./actions/coupon-delete.ts";
import brandList from "./actions/brand-list.ts";
import brandGet from "./actions/brand-get.ts";
import storeInfoGet from "./actions/store-info-get.ts";
import oauth2 from "./auth/oauth2.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    productList,
    productGet,
    productGetBySku,
    productCreate,
    productUpdate,
    productDelete,
    productChangeStatus,
    orderList,
    orderGet,
    orderStatusList,
    orderStatusUpdate,
    orderHistoryList,
    orderHistoryCreate,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    categoryList,
    categoryGet,
    categoryCreate,
    categoryUpdate,
    categoryDelete,
    couponList,
    couponGet,
    couponCreate,
    couponUpdate,
    couponDelete,
    brandList,
    brandGet,
    storeInfoGet,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

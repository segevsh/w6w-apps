import type { AppDefinition } from "@w6w/types";
import catalogProductGet from "./actions/catalog-product-get.ts";
import catalogProductList from "./actions/catalog-product-list.ts";
import catalogSizeGuideGet from "./actions/catalog-size-guide-get.ts";
import catalogVariantGet from "./actions/catalog-variant-get.ts";
import categoryList from "./actions/category-list.ts";
import countryList from "./actions/country-list.ts";
import fileAdd from "./actions/file-add.ts";
import fileGet from "./actions/file-get.ts";
import orderCancel from "./actions/order-cancel.ts";
import orderConfirm from "./actions/order-confirm.ts";
import orderCostEstimate from "./actions/order-cost-estimate.ts";
import orderCreate from "./actions/order-create.ts";
import orderGet from "./actions/order-get.ts";
import orderList from "./actions/order-list.ts";
import orderUpdate from "./actions/order-update.ts";
import shippingRateCalculate from "./actions/shipping-rate-calculate.ts";
import storeGet from "./actions/store-get.ts";
import storeList from "./actions/store-list.ts";
import syncProductCreate from "./actions/sync-product-create.ts";
import syncProductDelete from "./actions/sync-product-delete.ts";
import syncProductGet from "./actions/sync-product-get.ts";
import syncProductList from "./actions/sync-product-list.ts";
import webhookDisable from "./actions/webhook-disable.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookSet from "./actions/webhook-set.ts";
import accessToken from "./auth/access-token.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * Printful — print-on-demand: catalog, synced store products, orders, shipping rates, files, webhooks.
 * Built against the v1 API (stable reference at developers.printful.com/docs). Findings
 * (2026-10-06):
 *
 * - Responses are wrapped `{ code, result, paging? }`; errors keep the shape with `error.reason`.
 * - A private token is a Bearer token; an account-level token also needs `X-PF-Store-Id`.
 * - The status page rolls up ~40 integration components; only its `API` component is read.
 */
const app: AppDefinition = {
  actions: [
    catalogProductGet,
    catalogProductList,
    catalogSizeGuideGet,
    catalogVariantGet,
    categoryList,
    countryList,
    fileAdd,
    fileGet,
    orderCancel,
    orderConfirm,
    orderCostEstimate,
    orderCreate,
    orderGet,
    orderList,
    orderUpdate,
    shippingRateCalculate,
    storeGet,
    storeList,
    syncProductCreate,
    syncProductDelete,
    syncProductGet,
    syncProductList,
    webhookDisable,
    webhookGet,
    webhookSet,
  ],
  auth: [accessToken],
  healthChecks: [service, api, quota],
};

export default app;

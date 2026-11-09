import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import productCreate from "./actions/product-create.ts";
import productGet from "./actions/product-get.ts";
import productGetMany from "./actions/product-get-many.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import orderCreate from "./actions/order-create.ts";
import orderGet from "./actions/order-get.ts";
import orderGetMany from "./actions/order-get-many.ts";
import orderUpdate from "./actions/order-update.ts";
import orderDelete from "./actions/order-delete.ts";
import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerGetMany from "./actions/customer-get-many.ts";
import orderCreatedTrigger from "./triggers/order-created.ts";
import orderUpdatedTrigger from "./triggers/order-updated.ts";
import orderDeletedTrigger from "./triggers/order-deleted.ts";
import customerCreatedTrigger from "./triggers/customer-created.ts";
import productCreatedTrigger from "./triggers/product-created.ts";
import productUpdatedTrigger from "./triggers/product-updated.ts";
import eventTrigger from "./triggers/event.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    productCreate,
    productGet,
    productGetMany,
    productUpdate,
    productDelete,
    orderCreate,
    orderGet,
    orderGetMany,
    orderUpdate,
    orderDelete,
    customerCreate,
    customerGet,
    customerGetMany,
  ],
  triggers: [
    orderCreatedTrigger,
    orderUpdatedTrigger,
    orderDeletedTrigger,
    customerCreatedTrigger,
    productCreatedTrigger,
    productUpdatedTrigger,
    eventTrigger,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;

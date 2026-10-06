/**
 * Loyverse (Loyverse POS) — read and manage a merchant back office over API v1.0
 * (`api.loyverse.com`). Verified 2026-10-06 against the vendor OpenAPI 3.0 document
 * (`developer.loyverse.com/docs/API-Reference__v1.0.yaml`). See README.md for what
 * is deliberately not covered.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import categoryGet from "./actions/category-get.ts";
import categoryList from "./actions/category-list.ts";
import categorySave from "./actions/category-save.ts";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import customerSave from "./actions/customer-save.ts";
import discountList from "./actions/discount-list.ts";
import employeeGet from "./actions/employee-get.ts";
import employeeList from "./actions/employee-list.ts";
import inventoryList from "./actions/inventory-list.ts";
import inventoryUpdate from "./actions/inventory-update.ts";
import itemGet from "./actions/item-get.ts";
import itemList from "./actions/item-list.ts";
import merchantGet from "./actions/merchant-get.ts";
import paymentTypeList from "./actions/payment-type-list.ts";
import receiptGet from "./actions/receipt-get.ts";
import receiptList from "./actions/receipt-list.ts";
import shiftList from "./actions/shift-list.ts";
import storeGet from "./actions/store-get.ts";
import storeList from "./actions/store-list.ts";
import taxList from "./actions/tax-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    categoryGet,
    categoryList,
    categorySave,
    customerGet,
    customerList,
    customerSave,
    discountList,
    employeeGet,
    employeeList,
    inventoryList,
    inventoryUpdate,
    itemGet,
    itemList,
    merchantGet,
    paymentTypeList,
    receiptGet,
    receiptList,
    shiftList,
    storeGet,
    storeList,
    taxList,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

import type { AppDefinition } from "@w6w/types";
import accountingYearList from "./actions/accounting-year-list.ts";
import accountList from "./actions/account-list.ts";
import customerCreate from "./actions/customer-create.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerGet from "./actions/customer-get.ts";
import customerGroupList from "./actions/customer-group-list.ts";
import customerList from "./actions/customer-list.ts";
import employeeList from "./actions/employee-list.ts";
import entryList from "./actions/entry-list.ts";
import invoiceBook from "./actions/invoice-book.ts";
import invoiceBookedGet from "./actions/invoice-booked-get.ts";
import invoiceBookedList from "./actions/invoice-booked-list.ts";
import invoiceDraftCreate from "./actions/invoice-draft-create.ts";
import invoiceDraftDelete from "./actions/invoice-draft-delete.ts";
import invoiceDraftGet from "./actions/invoice-draft-get.ts";
import invoiceDraftList from "./actions/invoice-draft-list.ts";
import invoiceTemplateGet from "./actions/invoice-template-get.ts";
import layoutList from "./actions/layout-list.ts";
import orderDraftList from "./actions/order-draft-list.ts";
import paymentTermsList from "./actions/payment-terms-list.ts";
import productCreate from "./actions/product-create.ts";
import productDelete from "./actions/product-delete.ts";
import productGet from "./actions/product-get.ts";
import productGroupList from "./actions/product-group-list.ts";
import productList from "./actions/product-list.ts";
import selfGet from "./actions/self-get.ts";
import supplierList from "./actions/supplier-list.ts";
import unitList from "./actions/unit-list.ts";
import vatZoneList from "./actions/vat-zone-list.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    accountingYearList,
    accountList,
    customerCreate,
    customerDelete,
    customerGet,
    customerGroupList,
    customerList,
    employeeList,
    entryList,
    invoiceBook,
    invoiceBookedGet,
    invoiceBookedList,
    invoiceDraftCreate,
    invoiceDraftDelete,
    invoiceDraftGet,
    invoiceDraftList,
    invoiceTemplateGet,
    layoutList,
    orderDraftList,
    paymentTermsList,
    productCreate,
    productDelete,
    productGet,
    productGroupList,
    productList,
    selfGet,
    supplierList,
    unitList,
    vatZoneList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;

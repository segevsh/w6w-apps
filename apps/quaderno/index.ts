/**
 * Quaderno — tax-compliant invoicing and tax calculation.
 *
 * Every account has its own host (`<account>.quadernoapp.com`), so the manifest
 * declares `*.quadernoapp.com` and the account name is an Auth field recorded on
 * the connection by `afterConnect`. See README.md for the uncovered surface.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceDeliver from "./actions/invoice-deliver.ts";
import invoiceRecordPayment from "./actions/invoice-record-payment.ts";
import invoiceVoid from "./actions/invoice-void.ts";
import expenseList from "./actions/expense-list.ts";
import expenseGet from "./actions/expense-get.ts";
import expenseCreate from "./actions/expense-create.ts";
import estimateList from "./actions/estimate-list.ts";
import estimateGet from "./actions/estimate-get.ts";
import estimateCreate from "./actions/estimate-create.ts";
import creditList from "./actions/credit-list.ts";
import creditGet from "./actions/credit-get.ts";
import creditCreate from "./actions/credit-create.ts";
import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";
import taxCalculate from "./actions/tax-calculate.ts";
import webhookList from "./actions/webhook-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import account from "./health/account.ts";

export default {
  actions: [
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceDeliver,
    invoiceRecordPayment,
    invoiceVoid,
    expenseList,
    expenseGet,
    expenseCreate,
    estimateList,
    estimateGet,
    estimateCreate,
    creditList,
    creditGet,
    creditCreate,
    itemList,
    itemGet,
    taxCalculate,
    webhookList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, account],
} satisfies AppDefinition;

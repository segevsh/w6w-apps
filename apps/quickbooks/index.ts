/**
 * QuickBooks Online — customers, invoices, items, vendors, payments, bills,
 * the chart of accounts, estimates, a Profit and Loss report, and a raw
 * `query` escape hatch (Accounting API v3).
 *
 * Two things shape the code and are worth reading before changing it:
 *
 *   - **Every request is scoped to one company by a `realmId` path segment**
 *     (`/v3/company/{realmId}/...`), not a header the way Xero's tenant id
 *     is — see `lib/client.ts`'s doc comment for the URL-building rationale.
 *   - **`realmId` is a connect-time field, not something `afterConnect`
 *     resolves.** Unlike Xero/Jira, QuickBooks has no "list what this token
 *     can reach" endpoint — Intuit communicates the company id only via a
 *     `realmId` query parameter appended to the OAuth callback redirect, and
 *     this pack's generic Auth hook contract has no slot for it today. See
 *     `auth/oauth2.ts`'s doc comment for the full account.
 *
 * Deliberately absent: employees, credit memos, journal entries, purchase
 * orders, deposits, tax codes, terms, attachments (multipart upload, which
 * the sandbox's `ctx.fetch` is not for), and PDF download/send — all real
 * QuickBooks resources, left out to keep this first pass to a well-chosen
 * subset plus the generic `query` action for anything else.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";

import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";

import vendorList from "./actions/vendor-list.ts";
import vendorGet from "./actions/vendor-get.ts";

import accountList from "./actions/account-list.ts";

import paymentList from "./actions/payment-list.ts";
import paymentCreate from "./actions/payment-create.ts";

import billList from "./actions/bill-list.ts";
import billCreate from "./actions/bill-create.ts";

import estimateCreate from "./actions/estimate-create.ts";

import reportProfitAndLoss from "./actions/report-profit-and-loss.ts";

import query from "./actions/query.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // customer
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    // item
    itemList,
    itemGet,
    // vendor
    vendorList,
    vendorGet,
    // account
    accountList,
    // payment
    paymentList,
    paymentCreate,
    // bill
    billList,
    billCreate,
    // estimate
    estimateCreate,
    // report
    reportProfitAndLoss,
    // generic
    query,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

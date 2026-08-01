/**
 * Xero — w6w port of n8n's `Xero` node (Accounting API, `api.xro/2.0`).
 *
 * Covers contacts, invoices, bank transactions, items and the chart of
 * accounts. Two things shape the code and are worth reading before changing
 * it:
 *
 *   - **Tenant discovery is a separate call.** A Xero OAuth token grants
 *     access to one or more organisations ("tenants"), but the token itself
 *     doesn't say which — every API call must carry an `Xero-tenant-id`
 *     header naming one. `auth/oauth2.ts`'s `afterConnect` calls
 *     `GET https://api.xero.com/connections` right after the token exchange
 *     to discover them, and records the first tenant's id on the connection's
 *     `display` for `sign` to stamp onto every request. See that file's doc
 *     comment for the full account.
 *   - **One fixed API host.** Unlike Jira/Salesforce/Mailchimp, the tenant
 *     distinction is a header, not a host — so `lib/client.ts` needs no
 *     per-connection base-URL resolution at all.
 *
 * Deliberately absent: credit notes, purchase orders, quotes, payments,
 * manual journals, reports and attachments (multipart upload, which the
 * sandbox's `ctx.fetch` is not for) — all real Xero resources, left out to
 * keep this first pass to the actions the spec asked for.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";

import bankTransactionList from "./actions/bank-transaction-list.ts";
import bankTransactionGet from "./actions/bank-transaction-get.ts";

import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";

import accountList from "./actions/account-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contact
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    // bank transaction
    bankTransactionList,
    bankTransactionGet,
    // item
    itemList,
    itemGet,
    // account
    accountList,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

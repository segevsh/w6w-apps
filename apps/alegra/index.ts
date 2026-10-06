import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import billList from "./actions/bill-list.ts";
import companyGet from "./actions/company-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import estimateList from "./actions/estimate-list.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceDelete from "./actions/invoice-delete.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceSendEmail from "./actions/invoice-send-email.ts";
import invoiceVoid from "./actions/invoice-void.ts";
import itemCreate from "./actions/item-create.ts";
import itemDelete from "./actions/item-delete.ts";
import itemGet from "./actions/item-get.ts";
import itemList from "./actions/item-list.ts";
import itemUpdate from "./actions/item-update.ts";
import paymentCreate from "./actions/payment-create.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentList from "./actions/payment-list.ts";
import paymentVoid from "./actions/payment-void.ts";
import taxList from "./actions/tax-list.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Alegra — Latin American cloud accounting and invoicing (`api.alegra.com/api/v1`).
 *
 * Every path, parameter and body field was read from Alegra's own OpenAPI reference
 * (developer.alegra.com, `.md` pages) on 2026-10-06. Things worth knowing before extending it:
 *
 *  - Ids are STRINGS ("5" today, a UUID on resources migrated since 2025-01), so every id here is
 *    typed and path-encoded as a string.
 *  - Lists page with `start`/`limit` (default and MAX 30), and only `metadata=true` reveals the
 *    total, wrapping the rows in `{ metadata, data }`. Every list action normalises to
 *    `{ items, total }`.
 *  - Create bodies are `oneOf` per country version (Colombia, Mexico, Costa Rica, Chile, …); the
 *    actions model the common core and take country-specific fields through `additionalFields`.
 *  - The API gateway answers 401 `{"message":"Unauthorized"}` for any request without an accepted
 *    credential, whatever the path, so a status code alone never proves a route exists.
 */
export default {
  actions: [
    billList,
    companyGet,
    contactCreate,
    contactDelete,
    contactGet,
    contactList,
    contactUpdate,
    estimateList,
    invoiceCreate,
    invoiceDelete,
    invoiceGet,
    invoiceList,
    invoiceSendEmail,
    invoiceVoid,
    itemCreate,
    itemDelete,
    itemGet,
    itemList,
    itemUpdate,
    paymentCreate,
    paymentGet,
    paymentList,
    paymentVoid,
    taxList,
  ],
  auth: [basic],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;

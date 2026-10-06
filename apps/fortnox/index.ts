/**
 * Fortnox — Swedish cloud accounting / invoicing / ERP — over the REST API v3
 * at `api.fortnox.se`.
 *
 * Every path, verb, query parameter, body field and enum in this app was read
 * on 2026-10-06 from Fortnox's own OpenAPI 3.0.3 document (the Redoc page at
 * `api.fortnox.se/apidocs`, 6.8 MB, spec embedded in the HTML) and cross-checked
 * against the developer guides at `fortnox.se/developer` (authorization,
 * scopes, parameters, errors, rate limits) and the live Statuspage at
 * `status.fortnox.se`. No credential was available, so nothing here was
 * exercised against the live API.
 *
 * Findings that shape the app, each of which would cost a day of guessing:
 *
 *  1. **Refresh tokens rotate.** Every refresh returns a NEW refresh token and
 *     invalidates the old one (45-day life, access tokens 1 hour) — a host that
 *     drops the new refresh token locks the connection out on the next refresh.
 *  2. **The reference documents one OAuth scope (`developerapi`); the real
 *     scopes are per resource** (`customer`, `invoice`, `bookkeeping`, …, from
 *     the Scopes guide), grant read AND write, and a refresh token is only
 *     issued with `access_type=offline` on the authorize request.
 *  3. **Bodies are wrapped and list endpoints are named per resource.** A
 *     customer is sent and returned as `{"Customer": {...}}`, a list comes back
 *     as `{"Customers": [...], "MetaInformation": {...}}`; voucher series are
 *     `VoucherSeriesCollection`. Pagination is `page` + `limit` (max 500), and
 *     `limit`/`page` are not listed on any operation in the reference.
 *  4. **Updates are PUT and partial** (an omitted property is unchanged),
 *     except document rows: send every row, or give each kept row its RowId.
 *  5. **Rate limit: 25 requests per 5 seconds per access token** (HTTP 429),
 *     and no response header reporting headroom is documented.
 *
 * Not covered (the surface is 249 paths): payroll (employees, salary,
 * absence, attendance, schedule), assets, contracts and accruals, archive and
 * inbox files, file connections, price lists and prices, tax reductions,
 * labels, currencies, units, settings registers, SIE export, Nox Finans, the
 * warehouse (`/api/warehouse/*`), recurring billing, time reporting, bank
 * process orders and the partner/developer APIs.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import companyInformationGet from "./actions/company-information-get.ts";
import meGet from "./actions/me-get.ts";
import financialYearList from "./actions/financial-year-list.ts";
import financialYearGet from "./actions/financial-year-get.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import supplierList from "./actions/supplier-list.ts";
import supplierGet from "./actions/supplier-get.ts";
import supplierCreate from "./actions/supplier-create.ts";
import supplierUpdate from "./actions/supplier-update.ts";
import articleList from "./actions/article-list.ts";
import articleGet from "./actions/article-get.ts";
import articleCreate from "./actions/article-create.ts";
import articleUpdate from "./actions/article-update.ts";
import articleDelete from "./actions/article-delete.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceBookkeep from "./actions/invoice-bookkeep.ts";
import invoiceCancel from "./actions/invoice-cancel.ts";
import invoiceCredit from "./actions/invoice-credit.ts";
import invoiceSendEmail from "./actions/invoice-send-email.ts";
import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderCreate from "./actions/order-create.ts";
import orderUpdate from "./actions/order-update.ts";
import orderCreateInvoice from "./actions/order-create-invoice.ts";
import offerList from "./actions/offer-list.ts";
import offerGet from "./actions/offer-get.ts";
import offerCreate from "./actions/offer-create.ts";
import offerUpdate from "./actions/offer-update.ts";
import offerCreateOrder from "./actions/offer-create-order.ts";
import supplierInvoiceList from "./actions/supplier-invoice-list.ts";
import supplierInvoiceGet from "./actions/supplier-invoice-get.ts";
import supplierInvoiceCreate from "./actions/supplier-invoice-create.ts";
import supplierInvoiceBookkeep from "./actions/supplier-invoice-bookkeep.ts";
import voucherList from "./actions/voucher-list.ts";
import voucherGet from "./actions/voucher-get.ts";
import voucherCreate from "./actions/voucher-create.ts";
import voucherSeriesList from "./actions/voucher-series-list.ts";
import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import accountCreate from "./actions/account-create.ts";
import accountUpdate from "./actions/account-update.ts";
import invoicePaymentList from "./actions/invoice-payment-list.ts";
import invoicePaymentCreate from "./actions/invoice-payment-create.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import costCenterList from "./actions/cost-center-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    companyInformationGet,
    meGet,
    financialYearList,
    financialYearGet,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    supplierList,
    supplierGet,
    supplierCreate,
    supplierUpdate,
    articleList,
    articleGet,
    articleCreate,
    articleUpdate,
    articleDelete,
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    invoiceBookkeep,
    invoiceCancel,
    invoiceCredit,
    invoiceSendEmail,
    orderList,
    orderGet,
    orderCreate,
    orderUpdate,
    orderCreateInvoice,
    offerList,
    offerGet,
    offerCreate,
    offerUpdate,
    offerCreateOrder,
    supplierInvoiceList,
    supplierInvoiceGet,
    supplierInvoiceCreate,
    supplierInvoiceBookkeep,
    voucherList,
    voucherGet,
    voucherCreate,
    voucherSeriesList,
    accountList,
    accountGet,
    accountCreate,
    accountUpdate,
    invoicePaymentList,
    invoicePaymentCreate,
    projectList,
    projectGet,
    projectCreate,
    costCenterList,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

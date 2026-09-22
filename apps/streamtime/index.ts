/**
 * Streamtime — job tracking and project management for creative agencies, over
 * the Public API v2 (`api.streamtime.net`).
 *
 * Every path, verb, query parameter, body field and enum in this app was read out of
 * Streamtime's own OpenAPI 3.1 document, fetched live from
 * `https://api.streamtime.net/swagger.json` on 2026-09-22 (200, `application/json`,
 * 348,536 bytes, `info.title` "Public API", `info.version` "1.0.0", 58 paths / 84
 * operations), and cross-checked against unauthenticated probes of `api.streamtime.net`
 * on the same day. All 84 documented operations have an Action here; the README lists
 * what is deliberately absent and why.
 *
 * The findings that shaped the design, each documented where it matters:
 *
 *  1. **The API has no error envelope, and it gates before it routes**
 *     (`lib/client.ts`). A missing token, an invalid token and a path that does not exist
 *     all answer byte-identical `401`s whose whole body is the sentence "You are not
 *     authorised to make this request". So every credential verdict in this app is made
 *     from the body, never from the status code.
 *  2. **Most resources cannot be listed** (`actions/search-records.ts`). Companies, jobs,
 *     logged time, logged expenses, quotes and invoices are create-only at the collection
 *     level; `POST /search` — with its own filter-expression language — is how ids are
 *     found, and `GET /search/setup` and `GET /report/setup` are how the language, the
 *     sort columns and the groupable dimensions are discovered. `POST /report` answers the
 *     aggregate questions without pulling records back.
 *  3. **Statuses are per-organisation lookups, not enums** (`lib/params.ts`). Every
 *     `*Status` in the document is `{ id, name }` with names the customer can rename, so
 *     the write actions take those objects as JSON rather than pretending they are static
 *     option lists.
 *  4. **The spec marks some fields read-only that a create cannot do without**
 *     (`actions/job-create.ts`, `actions/invoice-payment-create.ts`). Those three fields
 *     are exposed deliberately, as a deviation the README records.
 *
 * Health: `service` reads Streamtime's own status page (its `API` component), `credential`
 * probes `GET /organisation` from the response body, and `quota` declares — with its basis
 * — that Streamtime publishes no quota or rate-limit surface at all.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import organisationGet from "./actions/organisation-get.ts";
import branchesList from "./actions/branches-list.ts";
import branchGet from "./actions/branch-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyGet from "./actions/company-get.ts";
import companyUpdate from "./actions/company-update.ts";
import companyAddressesList from "./actions/company-addresses-list.ts";
import companyContactsList from "./actions/company-contacts-list.ts";
import companyContactCreate from "./actions/company-contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import jobCreate from "./actions/job-create.ts";
import jobGet from "./actions/job-get.ts";
import jobUpdate from "./actions/job-update.ts";
import jobStatusUpdate from "./actions/job-status-update.ts";
import jobDuplicate from "./actions/job-duplicate.ts";
import jobActivityEntriesList from "./actions/job-activity-entries-list.ts";
import jobActivityEntryCreate from "./actions/job-activity-entry-create.ts";
import jobPhasesList from "./actions/job-phases-list.ts";
import jobPhaseCreate from "./actions/job-phase-create.ts";
import jobPhaseGet from "./actions/job-phase-get.ts";
import jobPhaseUpdate from "./actions/job-phase-update.ts";
import jobPhaseDelete from "./actions/job-phase-delete.ts";
import jobItemsList from "./actions/job-items-list.ts";
import jobItemCreate from "./actions/job-item-create.ts";
import jobItemGet from "./actions/job-item-get.ts";
import jobItemUpdate from "./actions/job-item-update.ts";
import jobItemDependenciesList from "./actions/job-item-dependencies-list.ts";
import jobItemRolesList from "./actions/job-item-roles-list.ts";
import jobItemRoleCreate from "./actions/job-item-role-create.ts";
import jobItemRoleGet from "./actions/job-item-role-get.ts";
import jobItemRoleUpdate from "./actions/job-item-role-update.ts";
import jobItemSubItemsList from "./actions/job-item-sub-items-list.ts";
import jobItemSubItemCreate from "./actions/job-item-sub-item-create.ts";
import jobItemSubItemGet from "./actions/job-item-sub-item-get.ts";
import jobItemSubItemUpdate from "./actions/job-item-sub-item-update.ts";
import jobItemUsersList from "./actions/job-item-users-list.ts";
import jobItemUserCreate from "./actions/job-item-user-create.ts";
import jobItemUserGet from "./actions/job-item-user-get.ts";
import jobItemUserUpdate from "./actions/job-item-user-update.ts";
import jobItemUserDelete from "./actions/job-item-user-delete.ts";
import jobMilestonesList from "./actions/job-milestones-list.ts";
import jobMilestoneCreate from "./actions/job-milestone-create.ts";
import jobMilestoneGet from "./actions/job-milestone-get.ts";
import jobMilestoneUpdate from "./actions/job-milestone-update.ts";
import jobMilestoneDelete from "./actions/job-milestone-delete.ts";
import quoteGet from "./actions/quote-get.ts";
import quoteLineItemsList from "./actions/quote-line-items-list.ts";
import quoteTrackedLineItemsList from "./actions/quote-tracked-line-items-list.ts";
import quoteHtmlGet from "./actions/quote-html-get.ts";
import quotePdfGet from "./actions/quote-pdf-get.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceLineItemsList from "./actions/invoice-line-items-list.ts";
import invoiceTrackedLineItemsList from "./actions/invoice-tracked-line-items-list.ts";
import invoicePaymentsList from "./actions/invoice-payments-list.ts";
import invoicePaymentCreate from "./actions/invoice-payment-create.ts";
import invoiceHtmlGet from "./actions/invoice-html-get.ts";
import invoicePdfGet from "./actions/invoice-pdf-get.ts";
import loggedExpenseCreate from "./actions/logged-expense-create.ts";
import loggedExpenseGet from "./actions/logged-expense-get.ts";
import loggedExpenseUpdate from "./actions/logged-expense-update.ts";
import loggedExpensePurchaseOrderGet from "./actions/logged-expense-purchase-order-get.ts";
import loggedExpensePurchaseOrderLineItemsList from "./actions/logged-expense-purchase-order-line-items-list.ts";
import loggedTimeCreate from "./actions/logged-time-create.ts";
import loggedTimesCreateBulk from "./actions/logged-times-create-bulk.ts";
import loggedTimeGet from "./actions/logged-time-get.ts";
import loggedTimeUpdate from "./actions/logged-time-update.ts";
import loggedTimeDelete from "./actions/logged-time-delete.ts";
import rateCardsList from "./actions/rate-cards-list.ts";
import rateCardGet from "./actions/rate-card-get.ts";
import rolesList from "./actions/roles-list.ts";
import roleGet from "./actions/role-get.ts";
import usersList from "./actions/users-list.ts";
import userGet from "./actions/user-get.ts";
import userSavedSegmentsList from "./actions/user-saved-segments-list.ts";
import labelsList from "./actions/labels-list.ts";
import labelCreate from "./actions/label-create.ts";
import labelsSearch from "./actions/labels-search.ts";
import labelDelete from "./actions/label-delete.ts";
import searchRecords from "./actions/search-records.ts";
import searchSetupGet from "./actions/search-setup-get.ts";
import reportSetupGet from "./actions/report-setup-get.ts";
import reportRun from "./actions/report-run.ts";
import service from "./health/service.ts";
import credential from "./health/credential.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Organisation
    organisationGet,

    // Branches
    branchesList,
    branchGet,

    // Companies and contacts
    companyCreate,
    companyGet,
    companyUpdate,
    companyAddressesList,
    companyContactsList,
    companyContactCreate,
    contactGet,
    contactUpdate,

    // Jobs
    jobCreate,
    jobGet,
    jobUpdate,
    jobStatusUpdate,
    jobDuplicate,
    jobActivityEntriesList,
    jobActivityEntryCreate,

    // Job phases
    jobPhasesList,
    jobPhaseCreate,
    jobPhaseGet,
    jobPhaseUpdate,
    jobPhaseDelete,

    // Job items
    jobItemsList,
    jobItemCreate,
    jobItemGet,
    jobItemUpdate,
    jobItemDependenciesList,

    // Job item roles
    jobItemRolesList,
    jobItemRoleCreate,
    jobItemRoleGet,
    jobItemRoleUpdate,

    // Job item sub-items
    jobItemSubItemsList,
    jobItemSubItemCreate,
    jobItemSubItemGet,
    jobItemSubItemUpdate,

    // Job item users
    jobItemUsersList,
    jobItemUserCreate,
    jobItemUserGet,
    jobItemUserUpdate,
    jobItemUserDelete,

    // Job milestones
    jobMilestonesList,
    jobMilestoneCreate,
    jobMilestoneGet,
    jobMilestoneUpdate,
    jobMilestoneDelete,

    // Quotes
    quoteGet,
    quoteLineItemsList,
    quoteTrackedLineItemsList,
    quoteHtmlGet,
    quotePdfGet,

    // Invoices
    invoiceGet,
    invoiceUpdate,
    invoiceLineItemsList,
    invoiceTrackedLineItemsList,
    invoicePaymentsList,
    invoicePaymentCreate,
    invoiceHtmlGet,
    invoicePdfGet,

    // Logged expenses
    loggedExpenseCreate,
    loggedExpenseGet,
    loggedExpenseUpdate,
    loggedExpensePurchaseOrderGet,
    loggedExpensePurchaseOrderLineItemsList,

    // Logged time
    loggedTimeCreate,
    loggedTimesCreateBulk,
    loggedTimeGet,
    loggedTimeUpdate,
    loggedTimeDelete,

    // Rate cards
    rateCardsList,
    rateCardGet,

    // Roles
    rolesList,
    roleGet,

    // Users
    usersList,
    userGet,
    userSavedSegmentsList,

    // Labels
    labelsList,
    labelCreate,
    labelsSearch,
    labelDelete,

    // Search and reports
    searchRecords,
    searchSetupGet,
    reportSetupGet,
    reportRun,
  ],
  // One method: the "via App" bearer token from Company Settings. Streamtime's other
  // option (OAuth) is a Partner-program registration, not something a user can configure
  // in a connection form — see auth/api-token.ts.
  auth: [apiToken],
  healthChecks: [service, credential, quota],
} satisfies AppDefinition;

/**
 * bexio — Swiss all-in-one CRM / accounting / invoicing platform, over the
 * REST API v2 at `api.bexio.com`.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-15 against bexio's own OpenAPI 3.0 document (extracted
 * from the Redoc-hydrated JSON embedded in `docs.bexio.com`'s HTML — bexio
 * publishes no standalone `.json`/`.yaml` spec file), plus a live probe of
 * `auth.bexio.com`'s OpenID configuration and the real Atlassian Statuspage
 * feed at `bexio-status.com`.
 *
 * Two findings that shaped this app and would each cost a day of guessing:
 *
 *  1. **There is no PUT/PATCH anywhere in this surface.** Editing an existing
 *     resource is a `POST` to `/2.0/<resource>/{id}` using the EXACT SAME
 *     request schema as create — bexio's docs call this "edit", not "update",
 *     and there is no partial-patch semantics: an omitted field is unset, not
 *     left unchanged (see `actions/contact-update.ts`).
 *  2. **`Accept: application/json` is a required parameter, not a
 *     convention.** The OpenAPI document marks it `required: true` on every
 *     single operation. `lib/client.ts` sends it unconditionally so no
 *     action has to think about it.
 *
 * A third, smaller trap: bexio's line-item ("position") schema for
 * quotes/orders/invoices is a 6-way discriminated union keyed by a literal
 * `type` string that must be spelled exactly (`KbPositionCustom`,
 * `KbPositionArticle`, …) — modeled here as a documented raw JSON field
 * rather than six parallel actions' worth of params.
 *
 * Auth is OAuth 2.0 / OpenID Connect against bexio's own Keycloak realm
 * (`auth.bexio.com`) — bexio publishes no API-key or basic-auth scheme for a
 * third-party integration.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactSearch from "./actions/contact-search.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceSearch from "./actions/invoice-search.ts";
import invoiceIssue from "./actions/invoice-issue.ts";

import quoteList from "./actions/quote-list.ts";
import quoteGet from "./actions/quote-get.ts";
import quoteCreate from "./actions/quote-create.ts";

import orderList from "./actions/order-list.ts";
import orderCreate from "./actions/order-create.ts";

import articleList from "./actions/article-list.ts";
import articleGet from "./actions/article-get.ts";
import articleCreate from "./actions/article-create.ts";
import articleSearch from "./actions/article-search.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";

import timesheetList from "./actions/timesheet-list.ts";
import timesheetCreate from "./actions/timesheet-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactSearch,
    // Invoices
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceSearch,
    invoiceIssue,
    // Quotes
    quoteList,
    quoteGet,
    quoteCreate,
    // Orders
    orderList,
    orderCreate,
    // Articles
    articleList,
    articleGet,
    articleCreate,
    articleSearch,
    // Projects
    projectList,
    projectGet,
    projectCreate,
    // Timesheets
    timesheetList,
    timesheetCreate,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

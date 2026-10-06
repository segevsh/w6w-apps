/**
 * Sellsy — CRM and invoicing, via the Sellsy API v2 (https://api.sellsy.com/v2).
 *
 * Verified 2026-10-06 against the published OpenAPI document (v2.303.0). Four
 * things worth knowing before reading the code:
 *
 *  1. **Two error shapes.** The API answers `{"error": {code, message, context,
 *     details}}`; the OAuth token endpoint (`login.sellsy.com`) answers plain
 *     OAuth `{"error": "invalid_client", "error_description": …}`. Each is parsed
 *     where it occurs (`lib/client.ts`, `auth/_shared.ts`).
 *  2. **Scopes are per client, and a missing one is a 403, not a 401.** The
 *     credential probe and the quota check use `GET /quotas` and treat a 403 as
 *     "credential fine, scope missing" rather than "connection broken".
 *  3. **Arrays are PHP-style** — `embed[]=a&embed[]=b` — and every list is capped
 *     at `limit` 100 with a `{pagination, data}` envelope; the `offset` is an opaque
 *     cursor you pass back, not a number, unless you start the paging with `0`.
 *  4. **Client credentials only work for *personal* clients**; private and public
 *     clients must use the authorization-code flow (PKCE required).
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";
import oauth2 from "./auth/oauth2.ts";
import commentCreate from "./actions/comment-create.ts";
import companyContactLink from "./actions/company-contact-link.ts";
import companyCreate from "./actions/company-create.ts";
import companyDelete from "./actions/company-delete.ts";
import companyGet from "./actions/company-get.ts";
import companySearch from "./actions/company-search.ts";
import companyUpdate from "./actions/company-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactUpdate from "./actions/contact-update.ts";
import estimateGet from "./actions/estimate-get.ts";
import estimateSearch from "./actions/estimate-search.ts";
import estimateStatusUpdate from "./actions/estimate-status-update.ts";
import individualCreate from "./actions/individual-create.ts";
import individualGet from "./actions/individual-get.ts";
import individualSearch from "./actions/individual-search.ts";
import individualUpdate from "./actions/individual-update.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceSearch from "./actions/invoice-search.ts";
import itemGet from "./actions/item-get.ts";
import itemSearch from "./actions/item-search.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityPipelinesList from "./actions/opportunity-pipelines-list.ts";
import opportunitySearch from "./actions/opportunity-search.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";
import paymentSearch from "./actions/payment-search.ts";
import quotaGet from "./actions/quota-get.ts";
import search from "./actions/search.ts";
import staffList from "./actions/staff-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskLabelsList from "./actions/task-labels-list.ts";
import taskSearch from "./actions/task-search.ts";
import taskUpdate from "./actions/task-update.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookEventsList from "./actions/webhook-events-list.ts";
import webhookList from "./actions/webhook-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    commentCreate,
    companyContactLink,
    companyCreate,
    companyDelete,
    companyGet,
    companySearch,
    companyUpdate,
    contactCreate,
    contactGet,
    contactSearch,
    contactUpdate,
    estimateGet,
    estimateSearch,
    estimateStatusUpdate,
    individualCreate,
    individualGet,
    individualSearch,
    individualUpdate,
    invoiceGet,
    invoiceSearch,
    itemGet,
    itemSearch,
    opportunityCreate,
    opportunityGet,
    opportunityPipelinesList,
    opportunitySearch,
    opportunityUpdate,
    paymentSearch,
    quotaGet,
    search,
    staffList,
    taskCreate,
    taskLabelsList,
    taskSearch,
    taskUpdate,
    webhookCreate,
    webhookDelete,
    webhookEventsList,
    webhookList,
  ],
  auth: [clientCredentials, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

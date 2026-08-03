/**
 * Jobber — field-service management: clients, quotes, jobs, scheduling and
 * invoicing for home-service businesses.
 *
 * Jobber has **no REST API**. Everything is a GraphQL POST to a single endpoint
 * (`https://api.getjobber.com/api/graphql`), so `lib/client.ts` is a GraphQL
 * client rather than a REST wrapper and each action owns its own document.
 * Four things are worth knowing before reading any action:
 *
 *   - **Failure arrives as HTTP 200.** A Jobber request can fail on three
 *     independent channels: the HTTP status, a transport-level `errors[]` array
 *     returned *with* a 200, and a per-mutation `userErrors[]` array returned
 *     with a 200 and no `errors[]`. `JobberClient.send` closes the first two;
 *     `unwrap` closes the third, and every mutation here routes through it.
 *   - **A dated version header is mandatory on every request.**
 *     `X-JOBBER-GRAPHQL-VERSION`, pinned to `2025-04-16`. Jobber does not
 *     reject a removed version — it silently upgrades the request to the next
 *     supported one, so the pin has to be maintained, not merely set.
 *   - **Ids are `EncodedId` strings, never integers.**
 *     `Z2lkOi8vSm9iYmVyL0NsaWVudC8xMTkxOTUzNDA` decodes to
 *     `gid://Jobber/Client/119195340`. An id from one query is the argument
 *     another takes verbatim.
 *   - **The budget is query cost, not request count.** 10,000 points per
 *     app/account pair, refilling at 500/second, one point per field, multiplied
 *     through connections by `first`/`last` — and 100 assumed when neither is
 *     given. Every connection in this app carries an explicit bound for that
 *     reason, and `health/quota.ts` reads the meter off `extensions.cost`.
 *
 * Everything here was transcribed from the live schema: Jobber's GraphQL
 * endpoint answers introspection unauthenticated, so field names, argument
 * names and enum values come from the server rather than from the docs — which
 * are a hand-maintained summary and have drifted (see the README).
 *
 * Deliberately absent: webhook triggers (`APP_DISCONNECT` and friends are
 * Triggers, not Actions), anything that emails a client on the account's
 * behalf, and `clientDelete` / `visitUncomplete` — see the README.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// Clients — the customer record every other object hangs off
import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientEdit from "./actions/client-edit.ts";
import clientArchive from "./actions/client-archive.ts";

// Properties — the serviced addresses. Quotes and jobs are priced per property,
// not per client, so these ids are load-bearing.
import propertyList from "./actions/property-list.ts";
import propertyCreate from "./actions/property-create.ts";

// Requests — inbound work requests, the step before a quote
import requestList from "./actions/request-list.ts";
import requestGet from "./actions/request-get.ts";
import requestCreate from "./actions/request-create.ts";

// Quotes — the estimate, and its approval
import quoteList from "./actions/quote-list.ts";
import quoteGet from "./actions/quote-get.ts";
import quoteCreate from "./actions/quote-create.ts";
import quoteApprove from "./actions/quote-approve.ts";

// Jobs — the contracted work
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCreateFromQuote from "./actions/job-create-from-quote.ts";

// Visits — the schedule: individual appointments belonging to a job
import visitList from "./actions/visit-list.ts";
import visitCreate from "./actions/visit-create.ts";
import visitComplete from "./actions/visit-complete.ts";

// Invoices — billing the completed work
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreateFromJob from "./actions/invoice-create-from-job.ts";
import invoiceMarkAsSent from "./actions/invoice-mark-as-sent.ts";

// Reference data — the price book, the team, and the account itself
import productList from "./actions/product-list.ts";
import userList from "./actions/user-list.ts";
import accountGet from "./actions/account-get.ts";

// Escape hatch — the schema is far larger than any manifest
import graphqlQuery from "./actions/graphql-query.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // client
    clientList,
    clientGet,
    clientCreate,
    clientEdit,
    clientArchive,
    // property
    propertyList,
    propertyCreate,
    // request
    requestList,
    requestGet,
    requestCreate,
    // quote
    quoteList,
    quoteGet,
    quoteCreate,
    quoteApprove,
    // job
    jobList,
    jobGet,
    jobCreateFromQuote,
    // visit
    visitList,
    visitCreate,
    visitComplete,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreateFromJob,
    invoiceMarkAsSent,
    // reference data
    productList,
    userList,
    accountGet,
    // raw
    graphqlQuery,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

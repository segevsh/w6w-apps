/**
 * Housecall Pro — field-service management for home-service businesses:
 * customers, jobs, estimates, leads, invoices, scheduling and dispatch, over the
 * Housecall v1 public API (`api.housecallpro.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Housecall Pro's own OpenAPI 3.0 document —
 * `reference/housecall.v1.yaml`, 222,172 bytes, `info.title` "Housecall v1 API",
 * one server, `https://api.housecallpro.com` — together with the four prose
 * pages published beside it (`authentication`, `changelog`, `franchise`,
 * `webhooks`) and live probes against `api.housecallpro.com` and
 * `status.housecallpro.com`. Nothing here came from a third-party integration
 * directory.
 *
 * **Finding that document was the hard part.** `docs.housecallpro.com` is a
 * Stoplight-hosted site that answers *every* path with the same ~449 KB
 * JavaScript shell, including its 404s, so nothing is readable by fetching a
 * documentation URL. The reference is served by Stoplight's own content API:
 * `https://stoplight.io/api/v1/projects/housecallpro/housecall-public-api/nodes/<path>`,
 * with `nodes/toc.json` as the index. The README records how that was located.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **`Authorization: Token`, not `Bearer`** (`auth/api-key.ts`). Both API-key
 *     schemes in the document specify `[Token {api-key}]`, and the
 *     authentication page warns that the prefix must be exact. `Bearer` is this
 *     same API's *OAuth* prefix, so using it with a key produces a 401
 *     indistinguishable from a revoked key.
 *  2. **The 401 body cannot tell you what went wrong** (`auth/api-key.ts`,
 *     `lib/client.ts`). `{"message":"Unauthorized"}` came back byte-identical
 *     for a missing credential, a wrong one, and the wrong prefix — four
 *     measured cases, one body. Both `test` hooks say "either", because saying
 *     one would be wrong half the time.
 *  3. **Fourteen operations refuse a Pro's own API key** (`lib/params.ts`).
 *     Their `security` lists only the Application API Key and the OAuth token —
 *     `/routes`, `/service_zones`, `/checklists`, `/api/price_book/services`,
 *     `GET /estimates/{id}`, job schedule/dispatch/lock. Those actions say so in
 *     their description, and the auth probe is deliberately `/company`, one of
 *     the 31 operations every credential kind can reach.
 *  4. **Three pagination envelopes and five error shapes** (`lib/client.ts`).
 *     The core list envelope, the price book's `total_count` / `data` variant,
 *     and four sub-resources with no envelope at all; errors arrive as
 *     `{message}`, `{error:{message}}`, `{error:"…"}`, `{errors:{field:[…]}}` or
 *     `{message, attr:[…]}`. Both are folded once, in the client.
 *  5. **The status page does not cover this API** (`health/service.ts`). Its
 *     nineteen components describe Pro web, the mobile apps, notifications and
 *     integrations — and "Add a job API", which is the separate *Partner Jobs*
 *     intake surface, not the public API. So the service check is
 *     `informational` and `health/api.ts` probes `api.housecallpro.com` directly.
 *
 * Two spellings of the same states coexist in this API and neither is wrong: the
 * job/estimate list **filter** takes `unscheduled` / `scheduled` / `in_progress`
 * / `completed` / `canceled`, while a job's own `work_status` **field** reports
 * `needs scheduling` / `scheduled` / `in progress` / `complete rated` /
 * `complete unrated` / `user canceled` / `pro canceled`. Feeding a response value
 * back into the filter returns nothing.
 *
 * Money is integers in **cents** everywhere — `total_amount`, `unit_price`,
 * `unit_cost`, `amount_due`, `subtotal`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import oauth from "./auth/oauth.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerAddressCreate from "./actions/customer-address-create.ts";

import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCreate from "./actions/job-create.ts";
import jobLineItemList from "./actions/job-line-item-list.ts";
import jobLineItemCreate from "./actions/job-line-item-create.ts";
import jobScheduleUpdate from "./actions/job-schedule-update.ts";
import jobDispatch from "./actions/job-dispatch.ts";
import jobNoteCreate from "./actions/job-note-create.ts";
import jobTagAdd from "./actions/job-tag-add.ts";
import jobAppointmentList from "./actions/job-appointment-list.ts";
import jobInvoiceList from "./actions/job-invoice-list.ts";

import estimateList from "./actions/estimate-list.ts";
import estimateGet from "./actions/estimate-get.ts";
import estimateOptionLineItemList from "./actions/estimate-option-line-item-list.ts";
import estimateOptionApprove from "./actions/estimate-option-approve.ts";
import estimateOptionDecline from "./actions/estimate-option-decline.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadConvert from "./actions/lead-convert.ts";

import companyGet from "./actions/company-get.ts";
import employeeList from "./actions/employee-list.ts";
import bookingWindowList from "./actions/booking-window-list.ts";
import eventList from "./actions/event-list.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import jobTypeList from "./actions/job-type-list.ts";
import leadSourceList from "./actions/lead-source-list.ts";
import serviceZoneList from "./actions/service-zone-list.ts";
import routeList from "./actions/route-list.ts";
import pipelineStatusList from "./actions/pipeline-status-list.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import priceBookServiceList from "./actions/price-book-service-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Customers
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerAddressCreate,
    // Jobs
    jobList,
    jobGet,
    jobCreate,
    jobLineItemList,
    jobLineItemCreate,
    jobScheduleUpdate,
    jobDispatch,
    jobNoteCreate,
    jobTagAdd,
    jobAppointmentList,
    jobInvoiceList,
    // Estimates
    estimateList,
    estimateGet,
    estimateOptionLineItemList,
    estimateOptionApprove,
    estimateOptionDecline,
    // Leads
    leadList,
    leadGet,
    leadCreate,
    leadConvert,
    // Company and reference data
    companyGet,
    employeeList,
    bookingWindowList,
    eventList,
    tagList,
    tagCreate,
    jobTypeList,
    leadSourceList,
    serviceZoneList,
    routeList,
    pipelineStatusList,
    // Invoices and price book
    invoiceList,
    invoiceGet,
    priceBookServiceList,
  ],
  // Both credential kinds the vendor publishes. An API key is what a Pro on the
  // MAX or XL plan generates for themselves; OAuth is issued only to approved
  // integration partners, and reaches fourteen operations the Pro's own key does
  // not. A Connection picks one.
  auth: [apiKey, oauth],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;

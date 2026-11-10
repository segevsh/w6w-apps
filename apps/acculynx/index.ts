/**
 * AccuLynx — the job-management and CRM platform for roofing and exterior contractors, over its v2
 * REST API (`https://api.acculynx.com/api/v2`).
 *
 * Every path, verb, parameter and body field here was verified on 2026-10-06 against AccuLynx's own
 * API reference (https://apidocs.acculynx.com/reference/; the server-rendered pages embed the full
 * OpenAPI document, v2.2614.0), plus live unauthenticated probes of `api.acculynx.com` and
 * `status.acculynx.com`.
 *
 * Findings that shaped the design (details in `lib/client.ts` and `README.md`):
 *
 *  1. **Pagination is spelled two ways.** `recordStartIndex` on some endpoints, `pageStartIndex` on
 *     others; the wrong one is silently ignored. Actions expose a single `startIndex`.
 *  2. **There is no "update job" or "list leads".** A lead IS a job in the Lead milestone, created
 *     with Create Job; edits are per-field sub-resources, of which this app covers address.
 *  3. **`/diagnostics/ping` answers without a key**, so it is a reachability probe and can never
 *     be the auth probe (`health/ping.ts` vs `auth/bearer-token.ts`).
 *
 * The reference documents about 105 paths. This app covers the 29 actions below; the
 * rest are listed in `README.md` under "Not yet covered".
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobSearch from "./actions/job-search.ts";
import jobCreate from "./actions/job-create.ts";
import jobUpdateAddress from "./actions/job-update-address.ts";
import jobRepresentativesList from "./actions/job-representatives-list.ts";
import jobMilestoneCurrent from "./actions/job-milestone-current.ts";
import jobEstimatesList from "./actions/job-estimates-list.ts";
import jobInvoicesList from "./actions/job-invoices-list.ts";
import jobMessageCreate from "./actions/job-message-create.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactNoteCreate from "./actions/contact-note-create.ts";
import contactJobsList from "./actions/contact-jobs-list.ts";
import contactTypeList from "./actions/contact-type-list.ts";
import calendarList from "./actions/calendar-list.ts";
import appointmentList from "./actions/appointment-list.ts";
import appointmentGet from "./actions/appointment-get.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import estimateGet from "./actions/estimate-get.ts";
import invoiceGet from "./actions/invoice-get.ts";
import companySettingsGet from "./actions/company-settings-get.ts";
import leadSourceList from "./actions/lead-source-list.ts";
import countryList from "./actions/country-list.ts";
import stateList from "./actions/state-list.ts";

import ping from "./health/ping.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    jobList,
    jobGet,
    jobSearch,
    jobCreate,
    jobUpdateAddress,
    jobRepresentativesList,
    jobMilestoneCurrent,
    jobEstimatesList,
    jobInvoicesList,
    jobMessageCreate,
    contactList,
    contactGet,
    contactSearch,
    contactCreate,
    contactUpdate,
    contactNoteCreate,
    contactJobsList,
    contactTypeList,
    calendarList,
    appointmentList,
    appointmentGet,
    userList,
    userGet,
    estimateGet,
    invoiceGet,
    companySettingsGet,
    leadSourceList,
    countryList,
    stateList,
  ],
  // A single static API key sent as a bearer token is AccuLynx's whole authentication story.
  auth: [bearerToken],
  healthChecks: [service, ping, quota],
} satisfies AppDefinition;

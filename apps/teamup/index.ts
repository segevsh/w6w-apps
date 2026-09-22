/**
 * TeamUp — class scheduling and member management for gyms and studios.
 *
 * TeamUp (goteamup.com) runs the day-to-day of a fitness business, and the
 * shape of its API is worth knowing before reading the actions — none of it is
 * guesswork, all of it comes from the operation data in the vendor's own API
 * reference (<https://docs.goteamup.com/api-reference>, read 2026-09-22):
 *
 *  - **One host, one prefix, REST/JSON**: `https://goteamup.com/api/v2`. The
 *    reference site's own pages (`docs.goteamup.com`, `goteamup.github.io`)
 *    are documentation hosts and are never called.
 *  - **One credential shape**: `Authorization: Bearer <M2M token>`. The M2M
 *    token is a long-lived opaque key created by hand in the business's own
 *    dashboard and tied to the business, not to a user — TeamUp's equivalent
 *    of an API key, and the only one of its three auth methods a headless
 *    workflow can use. It always acts in Provider mode, so no
 *    `TeamUp-Request-Mode` header is sent; `TeamUp-Provider-ID` is sent only
 *    when an action is given a `providerId`.
 *  - **One pagination envelope**, on every list: `{count, next, previous,
 *    results}` with `page` (1-based, default 1) and `page_size` (default and
 *    maximum 100). List actions return it verbatim — `count` is how a caller
 *    decides whether to keep paging.
 *  - **One error envelope**: `{"code", "field_errors", "message", "type"}`,
 *    where `type` is `invalid_request_error`, `conflict` or
 *    `event_check_failure`. `lib/client.ts` surfaces `message` and `code`.
 *  - **No usable status page.** `status.goteamup.com` is a real Statuspage
 *    whose certificate expired in June 2026 and whose components are still
 *    named `API (example)` — declared absent rather than probed. See
 *    `health/host.ts` and the README.
 *
 * `lib/client.ts` holds what those facts force on the code; `auth/token.ts`
 * holds the one place the credential is read; `lib/params.ts` and
 * `lib/outputs.ts` hold the param fragments and field lists the 29 actions
 * share.
 *
 * The scope is deliberate: TeamUp's reference documents roughly 650 operations
 * and this app ships the 29 a gym workflow actually runs on — customers, the
 * class schedule and its attendance, memberships and their instances, invoices,
 * instructors, venues, courses, staff, providers and offering types. The README
 * lists what was left out and why, including the two operations TeamUp's own
 * reference publishes without a request-body schema.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import host from "./health/host.ts";
import quota from "./health/quota.ts";

import customersList from "./actions/customers-list.ts";
import customersGet from "./actions/customers-get.ts";
import customersCreate from "./actions/customers-create.ts";
import eventsList from "./actions/events-list.ts";
import eventsGet from "./actions/events-get.ts";
import eventsCreate from "./actions/events-create.ts";
import eventsRegister from "./actions/events-register.ts";
import eventsUnregister from "./actions/events-unregister.ts";
import eventsJoinWaitlist from "./actions/events-join-waitlist.ts";
import eventsLeaveWaitlist from "./actions/events-leave-waitlist.ts";
import attendancesList from "./actions/attendances-list.ts";
import attendancesGet from "./actions/attendances-get.ts";
import membershipsList from "./actions/memberships-list.ts";
import membershipsGet from "./actions/memberships-get.ts";
import customerMembershipsList from "./actions/customer-memberships-list.ts";
import customerMembershipsGet from "./actions/customer-memberships-get.ts";
import customerMembershipsCreate from "./actions/customer-memberships-create.ts";
import instructorsList from "./actions/instructors-list.ts";
import instructorsGet from "./actions/instructors-get.ts";
import venuesList from "./actions/venues-list.ts";
import venuesGet from "./actions/venues-get.ts";
import invoicesList from "./actions/invoices-list.ts";
import invoicesGet from "./actions/invoices-get.ts";
import checkinsCreate from "./actions/checkins-create.ts";
import staffList from "./actions/staff-list.ts";
import coursesList from "./actions/courses-list.ts";
import courseSessionsList from "./actions/course-sessions-list.ts";
import providersList from "./actions/providers-list.ts";
import offeringTypesList from "./actions/offering-types-list.ts";

const app: AppDefinition = {
  actions: [
    // customers
    customersList,
    customersGet,
    customersCreate,
    // events — the class schedule
    eventsList,
    eventsGet,
    eventsCreate,
    eventsRegister,
    eventsUnregister,
    eventsJoinWaitlist,
    eventsLeaveWaitlist,
    // attendance
    attendancesList,
    attendancesGet,
    // memberships, and a customer's own instances of them
    membershipsList,
    membershipsGet,
    customerMembershipsList,
    customerMembershipsGet,
    customerMembershipsCreate,
    // vocabulary
    instructorsList,
    instructorsGet,
    venuesList,
    venuesGet,
    // money
    invoicesList,
    invoicesGet,
    checkinsCreate,
    // people, programs and locations
    staffList,
    coursesList,
    courseSessionsList,
    providersList,
    offeringTypesList,
  ],
  auth: [token],
  healthChecks: [host, quota],
};

export default app;

/**
 * Gusto — read and update a payroll account from a workflow: employees,
 * contractors, compensation, payrolls, pay schedules, time off and departments.
 *
 * This is Gusto's **App Integrations** API — the surface an app uses to work
 * with an existing Gusto customer's account. (Embedded Payroll, the other
 * surface, is for platforms that *host* payroll and needs a partnership.)
 *
 * Gusto's OpenAPI documents live in a private repository, but its own
 * Speakeasy-generated clients are public, and every path and required parameter
 * here was read from `Gusto/gusto-python-client`'s `gusto_app_int_v_2026_06_15`
 * package (fetched 2026-08-18). The versioning and auth behaviour was measured
 * against `api.gusto-demo.com` the same day.
 *
 * ## The API version header is not optional, and its default is deprecated
 *
 * Measured, `X-Gusto-API-Version` changes the answer and the response says so:
 *
 *   - **no header** → served, with `deprecation: @1719792000` — July 2024;
 *   - `2024-04-01` → `deprecation: @1749945600`, already past;
 *   - `2026-06-15` → no deprecation header. The current version;
 *   - `2099-01-01` → silently served as `2026-06-15`. An unknown version does
 *     not error, it falls back.
 *
 * This app pins `2026-06-15` on every request. And because the notice arrives
 * as a *response header*, the `api-version` health check reads it and reports
 * when the pin has aged out — which is otherwise the kind of thing nobody
 * notices until an endpoint changes shape.
 *
 * ## `version` is an optimistic lock, and this app does not defeat it
 *
 * Every Gusto write carries the record's `version` as last read, and Gusto
 * rejects a stale one rather than overwriting whatever changed in between. That
 * turns the classic lost update — two systems editing one employee, last writer
 * wins — into a `422` a workflow can retry.
 *
 * So the update actions **ask for the version** instead of fetching it
 * themselves. Re-reading and forcing the write through would defeat the lock:
 * the caller would be overwriting a change they never saw, which is precisely
 * what the mechanism prevents. The client's error message names that case when
 * it happens.
 *
 * ## Access tokens live two hours and refresh tokens are single-use
 *
 * Gusto's documentation is explicit about both. Every refresh returns a *new*
 * refresh token and invalidates the old one — so a host that does not persist
 * the new one ends the connection permanently, with no way back except sending
 * the user through the browser again. A `401` here therefore says "the refresh
 * did not happen" rather than "your token is wrong", because after two hours
 * that is nearly always what it means.
 *
 * ## What this app deliberately will not do
 *
 * Payroll is the one integration where the damage from a wrong call is somebody
 * not being paid, or being paid twice, or a legal filing being wrong. So:
 *
 *   - **No payroll submission.** Reading payrolls, per-employee breakdowns and
 *     deadlines is here; approving and submitting one is not.
 *   - **No bank details, and no SSN.** `employee-create` defaults to Gusto's
 *     self-onboarding, which collects both from the employee directly, and
 *     `employee-update` does not offer an `ssn` field even though the API
 *     accepts one.
 *   - **Garnishments are read-only.** They are court orders, not settings.
 *   - **Terminating requires an explicit confirmation**, and the parameters
 *     that carry legal weight say why in their own hints.
 *
 * Everything above is a deliberate narrowing of an API that would allow more.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2Demo from "./auth/oauth2-demo.ts";

import tokenInfo from "./actions/token-info.ts";
import companyGet from "./actions/company-get.ts";
import companyAdminList from "./actions/company-admin-list.ts";
import companyLocationList from "./actions/company-location-list.ts";

import employeeList from "./actions/employee-list.ts";
import employeeGet from "./actions/employee-get.ts";
import employeeCreate from "./actions/employee-create.ts";
import employeeUpdate from "./actions/employee-update.ts";
import employeeTerminate from "./actions/employee-terminate.ts";
import employeeHomeAddressList from "./actions/employee-home-address-list.ts";
import jobCompensationList from "./actions/job-compensation-list.ts";
import garnishmentList from "./actions/garnishment-list.ts";

import contractorList from "./actions/contractor-list.ts";
import contractorPaymentList from "./actions/contractor-payment-list.ts";

import payrollList from "./actions/payroll-list.ts";
import payrollGet from "./actions/payroll-get.ts";
import payPeriodList from "./actions/pay-period-list.ts";
import payScheduleList from "./actions/pay-schedule-list.ts";

import timeOffRequestList from "./actions/time-off-request-list.ts";
import departmentList from "./actions/department-list.ts";
import departmentCreate from "./actions/department-create.ts";
import departmentPeopleAdd from "./actions/department-people-add.ts";
import eventList from "./actions/event-list.ts";

import service from "./health/service.ts";
import apiVersion from "./health/api-version.ts";

export default {
  actions: [
    // where am I, and who is this
    tokenInfo,
    companyGet,
    companyAdminList,
    companyLocationList,
    // people
    employeeList,
    employeeGet,
    employeeCreate,
    employeeUpdate,
    employeeTerminate,
    employeeHomeAddressList,
    jobCompensationList,
    garnishmentList,
    // people who are not employees
    contractorList,
    contractorPaymentList,
    // money
    payrollList,
    payrollGet,
    payPeriodList,
    payScheduleList,
    // the rest of HR
    timeOffRequestList,
    departmentList,
    departmentCreate,
    departmentPeopleAdd,
    // what changed
    eventList,
  ],
  auth: [oauth2, oauth2Demo],
  healthChecks: [service, apiVersion],
} satisfies AppDefinition;

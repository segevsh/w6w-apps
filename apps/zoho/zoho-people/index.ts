/**
 * Zoho People — w6w app.
 *
 * HR automation over the Zoho People REST API (`https://people.zoho.com/people/api/...`
 * and its nine regional siblings). Every path, verb, parameter and response
 * shape was checked on 2026-10-06 against Zoho's own docs
 * (`https://www.zoho.com/people/api/`) plus live unauthenticated probes of all
 * ten regional hosts; the README lists what is deliberately left out.
 *
 * The findings that shaped the design:
 *
 *  1. **Ten data centres, API host `people.zoho.<tld>`** (`lib/regions.ts`) —
 *     the docs name six accounts hosts, and the token response's
 *     `api_domain` (`www.zohoapis.<tld>`) is not where People lives.
 *  2. **No single response envelope** (`lib/client.ts#unwrap`): forms/leave/
 *     time tracker wrap in `response.result`; Fetch-by-view and Attendance
 *     Entries answer a bare array/object; the v2 family (Cancel Leave)
 *     answers `{message,status}` and errors as `{error:{...}}`.
 *  3. **Errors are not always 4xx and `errors` is not always an object**: a
 *     missing credential is HTTP 400 `7202`, a dead one HTTP 401 `7213`, and
 *     time-tracker errors are an ARRAY where forms errors are an object. A
 *     failure can also arrive inside a 2xx as `response.status: 1`.
 *  4. **Writes take `inputData` as a JSON string in a form field**, keyed by
 *     the form's LABEL names, not API-ish identifiers.
 *  5. **No quota surface** (`health/quota.ts`) — declared absent.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import formList from "./actions/form-list.ts";
import formFieldsGet from "./actions/form-fields-get.ts";
import formViewsList from "./actions/form-views-list.ts";
import recordList from "./actions/record-list.ts";
import viewRecordsList from "./actions/view-records-list.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import employeeGet from "./actions/employee-get.ts";

import attendanceEntriesGet from "./actions/attendance-entries-get.ts";
import attendanceCheck from "./actions/attendance-check.ts";

import leaveTypesGet from "./actions/leave-types-get.ts";
import leaveApply from "./actions/leave-apply.ts";
import leaveCancel from "./actions/leave-cancel.ts";
import holidaysGet from "./actions/holidays-get.ts";

import jobsList from "./actions/jobs-list.ts";
import projectsList from "./actions/projects-list.ts";
import timelogsList from "./actions/timelogs-list.ts";
import timelogAdd from "./actions/timelog-add.ts";
import timesheetsList from "./actions/timesheets-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // forms & records
    formList,
    formFieldsGet,
    formViewsList,
    recordList,
    viewRecordsList,
    recordCreate,
    recordUpdate,
    employeeGet,
    // attendance
    attendanceEntriesGet,
    attendanceCheck,
    // leave
    leaveTypesGet,
    leaveApply,
    leaveCancel,
    holidaysGet,
    // time tracker
    jobsList,
    projectsList,
    timelogsList,
    timelogAdd,
    timesheetsList,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;

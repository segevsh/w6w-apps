/**
 * Rippling — HR, IT and payroll in one system. This app covers the REST API v2
 * (`rest.ripplingapis.com`): workers, users, org structure, time off,
 * compensation, and custom fields and objects.
 *
 * Every path, verb, parameter and body member here was read from the endpoint
 * reference at developer.rippling.com (the per-operation OpenAPI the reference
 * pages are generated from) and probed live where no token is needed. Nothing
 * came from a third-party directory.
 *
 * Findings that shaped it, in full where they matter:
 *
 *  1. **One host, one credential shape.** Everything is `rest.ripplingapis.com`
 *     with `Authorization: Bearer <API token>`. A token sees only what its
 *     creator's permission profile AND its ticked scopes both allow, and a
 *     hidden field comes back `null`, not as an error (`__meta.redacted_fields`
 *     names it) — list actions surface that as `redactedFields`.
 *  2. **Pagination hands back a URL.** A list answers `{ results, next_link }`;
 *     Rippling says to request `next_link` as-is. This app lifts its `cursor`
 *     out instead (`nextCursor`) and never fetches a URL a response supplied.
 *     The one exception in the API is the custom-object query, which returns a
 *     bare `cursor`.
 *  3. **Custom-object writes wrap the record.** Create and update answer
 *     `{ "data": { ... } }`; get-by-external-id answers it bare. Both are
 *     returned bare here.
 *  4. **The status page is company-wide.** `status.rippling.com` has a real
 *     `Platform API` component among 25 that are mostly Payroll/Benefits/Devices,
 *     so the health check reads that component and ignores the page indicator.
 *
 * Left out because it could not be confirmed against the reference: OAuth (the
 * App Shop flow is per listing — see `auth/api-token.ts`), draft hires, file
 * uploads, worker changes, time tracking, payroll runs and the Developer
 * Program/Agents/Functions platform endpoints.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import workerGet from "./actions/worker-get.ts";
import workerList from "./actions/worker-list.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import departmentCreate from "./actions/department-create.ts";
import departmentGet from "./actions/department-get.ts";
import departmentList from "./actions/department-list.ts";
import departmentUpdate from "./actions/department-update.ts";
import teamCreate from "./actions/team-create.ts";
import teamGet from "./actions/team-get.ts";
import teamList from "./actions/team-list.ts";
import teamUpdate from "./actions/team-update.ts";
import workLocationCreate from "./actions/work-location-create.ts";
import workLocationDelete from "./actions/work-location-delete.ts";
import workLocationGet from "./actions/work-location-get.ts";
import workLocationList from "./actions/work-location-list.ts";
import workLocationUpdate from "./actions/work-location-update.ts";
import employmentTypeGet from "./actions/employment-type-get.ts";
import employmentTypeList from "./actions/employment-type-list.ts";
import legalEntityGet from "./actions/legal-entity-get.ts";
import legalEntityList from "./actions/legal-entity-list.ts";
import companyList from "./actions/company-list.ts";
import levelGet from "./actions/level-get.ts";
import levelList from "./actions/level-list.ts";
import titleGet from "./actions/title-get.ts";
import titleList from "./actions/title-list.ts";
import leaveRequestCreate from "./actions/leave-request-create.ts";
import leaveRequestGet from "./actions/leave-request-get.ts";
import leaveRequestList from "./actions/leave-request-list.ts";
import leaveRequestUpdate from "./actions/leave-request-update.ts";
import leaveBalanceGet from "./actions/leave-balance-get.ts";
import leaveBalanceList from "./actions/leave-balance-list.ts";
import leaveTypeGet from "./actions/leave-type-get.ts";
import leaveTypeList from "./actions/leave-type-list.ts";
import compensationGet from "./actions/compensation-get.ts";
import compensationList from "./actions/compensation-list.ts";
import customFieldList from "./actions/custom-field-list.ts";
import customObjectFieldList from "./actions/custom-object-field-list.ts";
import customObjectRecordCreate from "./actions/custom-object-record-create.ts";
import customObjectRecordDelete from "./actions/custom-object-record-delete.ts";
import customObjectRecordGet from "./actions/custom-object-record-get.ts";
import customObjectRecordList from "./actions/custom-object-record-list.ts";
import customObjectRecordQuery from "./actions/custom-object-record-query.ts";
import customObjectRecordUpdate from "./actions/custom-object-record-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Workers & users
    workerGet,
    workerList,
    userGet,
    userList,
    // Org structure
    departmentCreate,
    departmentGet,
    departmentList,
    departmentUpdate,
    teamCreate,
    teamGet,
    teamList,
    teamUpdate,
    workLocationCreate,
    workLocationDelete,
    workLocationGet,
    workLocationList,
    workLocationUpdate,
    employmentTypeGet,
    employmentTypeList,
    legalEntityGet,
    legalEntityList,
    companyList,
    levelGet,
    levelList,
    titleGet,
    titleList,
    // Time off
    leaveRequestCreate,
    leaveRequestGet,
    leaveRequestList,
    leaveRequestUpdate,
    leaveBalanceGet,
    leaveBalanceList,
    leaveTypeGet,
    leaveTypeList,
    // Compensation
    compensationGet,
    compensationList,
    // Custom fields & objects
    customFieldList,
    customObjectFieldList,
    customObjectRecordCreate,
    customObjectRecordDelete,
    customObjectRecordGet,
    customObjectRecordList,
    customObjectRecordQuery,
    customObjectRecordUpdate,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

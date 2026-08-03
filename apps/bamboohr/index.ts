import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getEmployee from "./actions/get-employee.ts";
import listEmployees from "./actions/list-employees.ts";
import getEmployeesDirectory from "./actions/get-employees-directory.ts";
import createEmployee from "./actions/create-employee.ts";
import updateEmployee from "./actions/update-employee.ts";
import getEmployeeTableData from "./actions/get-employee-table-data.ts";
import listEmployeeFiles from "./actions/list-employee-files.ts";

import listTimeOffRequests from "./actions/list-time-off-requests.ts";
import createTimeOffRequest from "./actions/create-time-off-request.ts";
import updateTimeOffRequestStatus from "./actions/update-time-off-request-status.ts";
import getTimeOffBalance from "./actions/get-time-off-balance.ts";
import listWhosOut from "./actions/list-whos-out.ts";
import listTimeOffPolicies from "./actions/list-time-off-policies.ts";
import listTimeOffTypes from "./actions/list-time-off-types.ts";

import listFields from "./actions/list-fields.ts";
import listListFields from "./actions/list-list-fields.ts";

import listReports from "./actions/list-reports.ts";
import getReport from "./actions/get-report.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Employee — the record everything else hangs off
    getEmployee,
    listEmployees,
    getEmployeesDirectory,
    createEmployee,
    updateEmployee,
    getEmployeeTableData,
    listEmployeeFiles,
    // Time off
    listTimeOffRequests,
    createTimeOffRequest,
    updateTimeOffRequestStatus,
    getTimeOffBalance,
    listWhosOut,
    listTimeOffPolicies,
    listTimeOffTypes,
    // Field metadata — the `fields` vocabulary the employee reads depend on
    listFields,
    listListFields,
    // Reports
    listReports,
    getReport,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

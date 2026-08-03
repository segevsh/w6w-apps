import type { AppDefinition } from "@w6w/types";
import userToken from "./auth/user-token.ts";
// record
import queryRecords from "./actions/query-records.ts";
import upsertRecords from "./actions/upsert-records.ts";
import deleteRecords from "./actions/delete-records.ts";
import recordsModifiedSince from "./actions/records-modified-since.ts";
// table
import listTables from "./actions/list-tables.ts";
import getTable from "./actions/get-table.ts";
import createTable from "./actions/create-table.ts";
import updateTable from "./actions/update-table.ts";
import deleteTable from "./actions/delete-table.ts";
import listRelationships from "./actions/list-relationships.ts";
// field
import listFields from "./actions/list-fields.ts";
import getField from "./actions/get-field.ts";
import createField from "./actions/create-field.ts";
import updateField from "./actions/update-field.ts";
import deleteFields from "./actions/delete-fields.ts";
// report
import listReports from "./actions/list-reports.ts";
import getReport from "./actions/get-report.ts";
import runReport from "./actions/run-report.ts";
// app / formula
import getApp from "./actions/get-app.ts";
import runFormula from "./actions/run-formula.ts";
// health
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // record
    queryRecords,
    upsertRecords,
    deleteRecords,
    recordsModifiedSince,
    // table
    listTables,
    getTable,
    createTable,
    updateTable,
    deleteTable,
    listRelationships,
    // field
    listFields,
    getField,
    createField,
    updateField,
    deleteFields,
    // report
    listReports,
    getReport,
    runReport,
    // app
    getApp,
    runFormula,
  ],
  // One method. Quickbase's other credentials are not server-side credentials:
  // temporary tokens are browser-session-scoped, and `POST /auth/oauth/token`
  // is SAML assertion exchange rather than an OAuth authorization-code flow.
  // See `auth/user-token.ts` for the full reasoning.
  auth: [userToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

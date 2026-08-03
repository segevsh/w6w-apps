import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";
import listRecords from "./actions/list-records.ts";
import addRecords from "./actions/add-records.ts";
import updateRecords from "./actions/update-records.ts";
import upsertRecords from "./actions/upsert-records.ts";
import deleteRecords from "./actions/delete-records.ts";
import runSql from "./actions/run-sql.ts";
import listTables from "./actions/list-tables.ts";
import createTables from "./actions/create-tables.ts";
import listColumns from "./actions/list-columns.ts";
import addColumns from "./actions/add-columns.ts";
import deleteColumn from "./actions/delete-column.ts";
import downloadTable from "./actions/download-table.ts";
import describeDoc from "./actions/describe-doc.ts";
import listOrgs from "./actions/list-orgs.ts";
import listWorkspaces from "./actions/list-workspaces.ts";
import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // record
    listRecords,
    addRecords,
    updateRecords,
    upsertRecords,
    deleteRecords,
    runSql,
    // table
    listTables,
    createTables,
    downloadTable,
    // column
    listColumns,
    addColumns,
    deleteColumn,
    // doc / org / workspace
    describeDoc,
    listOrgs,
    listWorkspaces,
  ],
  // API key first: it is the only method that works against a self-hosted
  // install, and needs no app registration. OAuth is scoped but hosted-only.
  auth: [apiKey, oauth2],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;

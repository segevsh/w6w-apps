import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import listDocs from "./actions/list-docs.ts";
import getDoc from "./actions/get-doc.ts";
import listTables from "./actions/list-tables.ts";
import listColumns from "./actions/list-columns.ts";
import listRows from "./actions/list-rows.ts";
import getRow from "./actions/get-row.ts";
import upsertRows from "./actions/upsert-rows.ts";
import updateRow from "./actions/update-row.ts";
import deleteRow from "./actions/delete-row.ts";
import deleteRows from "./actions/delete-rows.ts";
import getMutationStatus from "./actions/get-mutation-status.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // doc
    listDocs,
    getDoc,
    // table
    listTables,
    // column
    listColumns,
    // row
    listRows,
    getRow,
    upsertRows,
    updateRow,
    deleteRow,
    deleteRows,
    // mutation
    getMutationStatus,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

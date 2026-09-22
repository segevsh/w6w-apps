import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// solutions
import listSolutions from "./actions/list-solutions.ts";
import getSolution from "./actions/get-solution.ts";

// tables
import listTables from "./actions/list-tables.ts";
import getTable from "./actions/get-table.ts";

// fields
import addField from "./actions/add-field.ts";
import updateField from "./actions/update-field.ts";

// records
import listRecords from "./actions/list-records.ts";
import getRecord from "./actions/get-record.ts";
import createRecord from "./actions/create-record.ts";
import updateRecord from "./actions/update-record.ts";
import deleteRecord from "./actions/delete-record.ts";
import bulkAddRecords from "./actions/bulk-add-records.ts";
import bulkUpdateRecords from "./actions/bulk-update-records.ts";
import bulkDeleteRecords from "./actions/bulk-delete-records.ts";

// comments
import listComments from "./actions/list-comments.ts";
import addComment from "./actions/add-comment.ts";

// members
import listMembers from "./actions/list-members.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // solutions
    listSolutions,
    getSolution,
    // tables
    listTables,
    getTable,
    // fields
    addField,
    updateField,
    // records
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    bulkAddRecords,
    bulkUpdateRecords,
    bulkDeleteRecords,
    // comments
    listComments,
    addComment,
    // members
    listMembers,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;

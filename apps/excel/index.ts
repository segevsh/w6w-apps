import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// workbook — discovery and the session lifecycle
import listWorkbooks from "./actions/list-workbooks.ts";
import createSession from "./actions/create-session.ts";
import closeSession from "./actions/close-session.ts";

// worksheet
import listWorksheets from "./actions/list-worksheets.ts";
import addWorksheet from "./actions/add-worksheet.ts";
import updateWorksheet from "./actions/update-worksheet.ts";
import deleteWorksheet from "./actions/delete-worksheet.ts";

// range
import getRange from "./actions/get-range.ts";
import updateRange from "./actions/update-range.ts";
import clearRange from "./actions/clear-range.ts";
import getUsedRange from "./actions/get-used-range.ts";

// table
import listTables from "./actions/list-tables.ts";
import addTable from "./actions/add-table.ts";
import listTableRows from "./actions/list-table-rows.ts";
import addTableRows from "./actions/add-table-rows.ts";

// chart
import getChartImage from "./actions/get-chart-image.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listWorkbooks,
    createSession,
    closeSession,
    listWorksheets,
    addWorksheet,
    updateWorksheet,
    deleteWorksheet,
    getRange,
    updateRange,
    clearRange,
    getUsedRange,
    listTables,
    addTable,
    listTableRows,
    addTableRows,
    getChartImage,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

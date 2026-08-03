import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import listSheets from "./actions/list-sheets.ts";
import getSheet from "./actions/get-sheet.ts";
import createSheet from "./actions/create-sheet.ts";

import getRow from "./actions/get-row.ts";
import addRows from "./actions/add-rows.ts";
import updateRows from "./actions/update-rows.ts";
import deleteRows from "./actions/delete-rows.ts";

import listColumns from "./actions/list-columns.ts";
import addColumn from "./actions/add-column.ts";

import listWorkspaces from "./actions/list-workspaces.ts";
import listContainerChildren from "./actions/list-container-children.ts";

import search from "./actions/search.ts";
import searchSheet from "./actions/search-sheet.ts";

import listUsers from "./actions/list-users.ts";
import getCurrentUser from "./actions/get-current-user.ts";
import listReports from "./actions/list-reports.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sheet — the container everything else hangs off
    listSheets,
    getSheet,
    createSheet,
    // Row + cell — the core model; cells are keyed by columnId, never by title
    getRow,
    addRows,
    updateRows,
    deleteRows,
    // Column — the lookup table that makes the cell ids above meaningful
    listColumns,
    addColumn,
    // Containers — workspaces and folders
    listWorkspaces,
    listContainerChildren,
    // Search
    search,
    searchSheet,
    // Org metadata
    listUsers,
    getCurrentUser,
    listReports,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

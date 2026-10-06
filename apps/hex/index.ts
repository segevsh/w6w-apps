import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectRun from "./actions/project-run.ts";
import projectRunsList from "./actions/project-runs-list.ts";
import runGet from "./actions/run-get.ts";
import runCancel from "./actions/run-cancel.ts";
import projectQueriedTablesList from "./actions/project-queried-tables-list.ts";
import userList from "./actions/user-list.ts";
import meGet from "./actions/me-get.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import dataConnectionList from "./actions/data-connection-list.ts";
import dataConnectionGet from "./actions/data-connection-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Projects and runs
    projectList,
    projectGet,
    projectRun,
    projectRunsList,
    runGet,
    runCancel,
    projectQueriedTablesList,
    // Workspace
    meGet,
    userList,
    groupList,
    groupGet,
    collectionList,
    collectionGet,
    dataConnectionList,
    dataConnectionGet,
  ],
  // API token only: Hex documents a single `http`/`bearer` security scheme.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

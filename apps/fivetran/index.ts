/**
 * Fivetran — run the pipelines that fill a warehouse: trigger and watch
 * connection syncs, pause and resume them, run the dbt transformations that
 * turn raw rows into models, and read the destinations behind it all.
 *
 * See `lib/client.ts` for what shapes the app — a versioned Accept header, an
 * enveloped response, and the fact that a "group" is a destination — and
 * `README.md` for the distinction that costs money: `sync` is incremental and
 * `resync` re-bills every row.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import connectionsHealth from "./health/connections.ts";
import quota from "./health/quota.ts";

import connectionList from "./actions/connection-list.ts";
import connectionGet from "./actions/connection-get.ts";
import connectionSync from "./actions/connection-sync.ts";
import connectionResync from "./actions/connection-resync.ts";
import connectionPause from "./actions/connection-pause.ts";
import connectionSyncHistory from "./actions/connection-sync-history.ts";
import connectionSchemaGet from "./actions/connection-schema-get.ts";
import connectionTest from "./actions/connection-test.ts";
import groupList from "./actions/group-list.ts";
import groupConnectionList from "./actions/group-connection-list.ts";
import destinationList from "./actions/destination-list.ts";
import destinationGet from "./actions/destination-get.ts";
import transformationList from "./actions/transformation-list.ts";
import transformationGet from "./actions/transformation-get.ts";
import transformationRun from "./actions/transformation-run.ts";
import transformationCancel from "./actions/transformation-cancel.ts";
import transformationProjectList from "./actions/transformation-project-list.ts";
import accountInfoGet from "./actions/account-info-get.ts";
import userList from "./actions/user-list.ts";
import connectorTypeList from "./actions/connector-type-list.ts";

const app: AppDefinition = {
  actions: [
    connectionList,
    connectionGet,
    connectionSync,
    connectionResync,
    connectionPause,
    connectionSyncHistory,
    connectionSchemaGet,
    connectionTest,
    groupList,
    groupConnectionList,
    destinationList,
    destinationGet,
    transformationList,
    transformationGet,
    transformationRun,
    transformationCancel,
    transformationProjectList,
    accountInfoGet,
    userList,
    connectorTypeList,
  ],
  auth: [apiKey],
  healthChecks: [service, connectionsHealth, quota],
};

export default app;

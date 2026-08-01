/**
 * Databricks — SQL Statement Execution and Unity Catalog against a
 * Databricks workspace's REST API (`/api/2.0/sql/*`, `/api/2.1/unity-catalog/*`).
 *
 * Every path, verb, and body field below was verified against n8n's
 * `nodes-base/nodes/Databricks/` (a modern, actively-maintained node covering
 * SQL, Unity Catalog, Files, Model Serving, Genie and Vector Search), and the
 * `Authorization: Bearer <token>` auth against `DatabricksApi.credentials.ts`.
 * Jobs and Clusters actions were deliberately left out — n8n's own Databricks
 * node doesn't implement them either, and their exact request/response shapes
 * couldn't be independently verified in this environment, so nothing was
 * invented for them.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import sqlStatementExecute from "./actions/sql-statement-execute.ts";
import sqlStatementGet from "./actions/sql-statement-get.ts";
import catalogList from "./actions/catalog-list.ts";
import catalogGet from "./actions/catalog-get.ts";
import catalogCreate from "./actions/catalog-create.ts";
import catalogDelete from "./actions/catalog-delete.ts";
import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";

import service from "./health/service.ts";
import workspace from "./health/workspace.ts";

export default {
  actions: [
    sqlStatementExecute,
    sqlStatementGet,
    catalogList,
    catalogGet,
    catalogCreate,
    catalogDelete,
    tableList,
    tableGet,
  ],
  auth: [bearerToken],
  healthChecks: [service, workspace],
} satisfies AppDefinition;

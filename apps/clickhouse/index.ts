/**
 * ClickHouse — the control plane and the query interface.
 *
 * The category RFC names Postgres, MySQL and MongoDB for `databases`, and none
 * of them can be an HTTP app: they speak binary wire protocols. ClickHouse's
 * native interface **is** HTTP, so this is the one app in the slug that can
 * actually run a query and return rows.
 *
 * That means two credentials for two planes — an organisation API key for
 * managing services, and a service's own database user for SQL. See
 * `lib/client.ts` and `lib/query.ts`; the actions say which they need rather
 * than failing obscurely.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import serviceAuth from "./auth/service.ts";

import serviceStatus from "./health/service.ts";
import quota from "./health/quota.ts";

import organizationList from "./actions/organization-list.ts";
import serviceList from "./actions/service-list.ts";
import serviceGet from "./actions/service-get.ts";
import serviceCreate from "./actions/service-create.ts";
import serviceState from "./actions/service-state.ts";
import serviceScale from "./actions/service-scale.ts";
import serviceDelete from "./actions/service-delete.ts";
import ipAccessListSet from "./actions/ip-access-list-set.ts";
import backupList from "./actions/backup-list.ts";
import activityList from "./actions/activity-list.ts";
import usageCost from "./actions/usage-cost.ts";
import queryRun from "./actions/query-run.ts";
import queryInsert from "./actions/query-insert.ts";
import tableList from "./actions/table-list.ts";
import tableDescribe from "./actions/table-describe.ts";

const app: AppDefinition = {
  actions: [
    organizationList,
    serviceList,
    serviceGet,
    serviceCreate,
    serviceState,
    serviceScale,
    serviceDelete,
    ipAccessListSet,
    backupList,
    activityList,
    usageCost,
    queryRun,
    queryInsert,
    tableList,
    tableDescribe,
  ],
  auth: [apiKey, serviceAuth],
  healthChecks: [serviceStatus, quota],
};

export default app;

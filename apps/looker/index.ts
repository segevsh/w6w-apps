/**
 * Looker — run Looks and inline queries against the modelled data, and inspect
 * the models, dashboards, users and schedules around them.
 *
 * The thing to keep in mind throughout: Looker holds no data. Every query here
 * compiles LookML to SQL and runs it against the customer's warehouse, so the
 * cost and the latency belong to somebody else's database — which is why every
 * query action demands a positive row limit and refuses Looker's unlimited
 * `-1`. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiCredentials from "./auth/api-credentials.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";

import meGet from "./actions/me-get.ts";
import modelList from "./actions/model-list.ts";
import exploreGet from "./actions/explore-get.ts";
import queryRun from "./actions/query-run.ts";
import lookList from "./actions/look-list.ts";
import lookGet from "./actions/look-get.ts";
import lookRun from "./actions/look-run.ts";
import dashboardList from "./actions/dashboard-list.ts";
import scheduledPlanList from "./actions/scheduled-plan-list.ts";
import userList from "./actions/user-list.ts";
import connectionList from "./actions/connection-list.ts";

const app: AppDefinition = {
  actions: [
    meGet,
    modelList,
    exploreGet,
    queryRun,
    lookList,
    lookGet,
    lookRun,
    dashboardList,
    scheduledPlanList,
    userList,
    connectionList,
  ],
  auth: [apiCredentials],
  healthChecks: [service, instance],
};

export default app;

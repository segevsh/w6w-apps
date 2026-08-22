/**
 * New Relic — query with NRQL, search entities, manage tags and alerts, read
 * dashboards, and record deployments.
 *
 * The thing that shapes this app is in `lib/client.ts`: NerdGraph is GraphQL,
 * so errors arrive inside HTTP 200 at three separate levels, and one of them is
 * inside each mutation's own payload.
 */
import type { AppDefinition } from "@w6w/types";

import userKey from "./auth/user-key.ts";

import service from "./health/service.ts";
import reporting from "./health/reporting.ts";
import quota from "./health/quota.ts";

import nrqlQuery from "./actions/nrql-query.ts";
import graphqlQuery from "./actions/graphql-query.ts";
import accountList from "./actions/account-list.ts";
import userGet from "./actions/user-get.ts";
import entitySearch from "./actions/entity-search.ts";
import entityGet from "./actions/entity-get.ts";
import entityTagAdd from "./actions/entity-tag-add.ts";
import entityTagDelete from "./actions/entity-tag-delete.ts";
import alertPolicyList from "./actions/alert-policy-list.ts";
import alertConditionList from "./actions/alert-condition-list.ts";
import issueList from "./actions/issue-list.ts";
import issueAcknowledge from "./actions/issue-acknowledge.ts";
import issueClose from "./actions/issue-close.ts";
import deploymentCreate from "./actions/deployment-create.ts";
import dashboardList from "./actions/dashboard-list.ts";
import dashboardGet from "./actions/dashboard-get.ts";
import syntheticsMonitorList from "./actions/synthetics-monitor-list.ts";

const app: AppDefinition = {
  actions: [
    nrqlQuery,
    graphqlQuery,
    accountList,
    userGet,
    entitySearch,
    entityGet,
    entityTagAdd,
    entityTagDelete,
    alertPolicyList,
    alertConditionList,
    issueList,
    issueAcknowledge,
    issueClose,
    deploymentCreate,
    dashboardList,
    dashboardGet,
    syntheticsMonitorList,
  ],
  auth: [userKey],
  healthChecks: [service, reporting, quota],
};

export default app;

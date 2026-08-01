import type { AppDefinition } from "@w6w/types";
import serviceAccountToken from "./auth/service-account-token.ts";
import dashboardList from "./actions/dashboard-list.ts";
import dashboardGet from "./actions/dashboard-get.ts";
import dashboardCreateUpdate from "./actions/dashboard-create-update.ts";
import datasourceList from "./actions/datasource-list.ts";
import datasourceGet from "./actions/datasource-get.ts";
import annotationCreate from "./actions/annotation-create.ts";
import alertRuleList from "./actions/alert-rule-list.ts";
import alertRuleGet from "./actions/alert-rule-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    dashboardList,
    dashboardGet,
    dashboardCreateUpdate,
    datasourceList,
    datasourceGet,
    annotationCreate,
    alertRuleList,
    alertRuleGet,
  ],
  auth: [serviceAccountToken],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;

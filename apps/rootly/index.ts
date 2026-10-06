import type { AppDefinition } from "@w6w/types";
import incidentList from "./actions/incident-list.ts";
import incidentGet from "./actions/incident-get.ts";
import incidentCreate from "./actions/incident-create.ts";
import incidentUpdate from "./actions/incident-update.ts";
import incidentResolve from "./actions/incident-resolve.ts";
import incidentMitigate from "./actions/incident-mitigate.ts";
import incidentEventList from "./actions/incident-event-list.ts";
import incidentEventCreate from "./actions/incident-event-create.ts";
import incidentActionItemList from "./actions/incident-action-item-list.ts";
import incidentActionItemCreate from "./actions/incident-action-item-create.ts";
import alertList from "./actions/alert-list.ts";
import alertGet from "./actions/alert-get.ts";
import alertCreate from "./actions/alert-create.ts";
import alertUpdate from "./actions/alert-update.ts";
import alertResolve from "./actions/alert-resolve.ts";
import serviceList from "./actions/service-list.ts";
import serviceGet from "./actions/service-get.ts";
import serviceCreate from "./actions/service-create.ts";
import serviceUpdate from "./actions/service-update.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamCreate from "./actions/team-create.ts";
import teamUpdate from "./actions/team-update.ts";
import severityList from "./actions/severity-list.ts";
import environmentList from "./actions/environment-list.ts";
import functionalityList from "./actions/functionality-list.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userGetCurrent from "./actions/user-get-current.ts";
import scheduleList from "./actions/schedule-list.ts";
import shiftList from "./actions/shift-list.ts";
import oncallList from "./actions/oncall-list.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Rootly — incident management. Findings that shaped this app (2026-10-06):
 *
 * - The API is JSON:API: bodies are `application/vnd.api+json` and wrapped as
 *   `{ data: { type, [id,] attributes } }`. A team's type is `groups`, not `teams`.
 * - Responses are flattened to `{ ...attributes, id, type }`; related records come back in
 *   `included` only when asked for with `include`.
 * - Auth is a bearer token. A missing and a wrong token answer the same
 *   `{"errors":[{"title":"Invalid token"}]}` 401, and a role-restricted token 403s on
 *   resources outside its reach (which still counts as a working connection).
 * - `status.rootly.com` sits behind a Cloudflare challenge, so vendor status is declared
 *   unavailable; the API's own JSON 401 is the reachability probe.
 */
const app: AppDefinition = {
  actions: [
    incidentList,
    incidentGet,
    incidentCreate,
    incidentUpdate,
    incidentResolve,
    incidentMitigate,
    incidentEventList,
    incidentEventCreate,
    incidentActionItemList,
    incidentActionItemCreate,
    alertList,
    alertGet,
    alertCreate,
    alertUpdate,
    alertResolve,
    serviceList,
    serviceGet,
    serviceCreate,
    serviceUpdate,
    teamList,
    teamGet,
    teamCreate,
    teamUpdate,
    severityList,
    environmentList,
    functionalityList,
    userList,
    userGet,
    userGetCurrent,
    scheduleList,
    shiftList,
    oncallList,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
};

export default app;

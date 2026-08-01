/**
 * PagerDuty — incidents, services, on-call schedules and escalation
 * policies, against PagerDuty's REST API (`https://api.pagerduty.com`).
 *
 * Ported against PagerDuty's own OpenAPI schema
 * (https://github.com/PagerDuty/api-schema) and cross-checked against n8n's
 * `PagerDuty` node (`pagerDutyApiRequest` in `GenericFunctions.ts`) for the
 * auth header shape and the resources it already covers (incidents,
 * incident notes, log entries, users). Services, on-call and escalation
 * policy listing extend past what n8n's node exposes as actions (n8n only
 * uses them internally for its dropdown `loadOptions`), verified directly
 * against the OpenAPI schema.
 *
 * Deliberately out of scope:
 *   - Log entry actions (`GET /log_entries`, `GET /log_entries/{id}`) — the
 *     spec's action list calls for a NOTE-create action, which is covered by
 *     `incident-note-create`; a bare log-entry reader adds little a workflow
 *     author would reach for, so it was left out to keep the surface focused.
 *   - GitHub-Enterprise-style self-hosted variants — n/a for PagerDuty,
 *     which is SaaS-only.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import incidentList from "./actions/incident-list.ts";
import incidentGet from "./actions/incident-get.ts";
import incidentCreate from "./actions/incident-create.ts";
import incidentUpdate from "./actions/incident-update.ts";
import incidentAcknowledge from "./actions/incident-acknowledge.ts";
import incidentResolve from "./actions/incident-resolve.ts";
import incidentReassign from "./actions/incident-reassign.ts";
import incidentNoteCreate from "./actions/incident-note-create.ts";
import serviceList from "./actions/service-list.ts";
import serviceGet from "./actions/service-get.ts";
import scheduleList from "./actions/schedule-list.ts";
import scheduleGet from "./actions/schedule-get.ts";
import oncallList from "./actions/oncall-list.ts";
import escalationPolicyList from "./actions/escalation-policy-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // incident
    incidentList,
    incidentGet,
    incidentCreate,
    incidentUpdate,
    incidentAcknowledge,
    incidentResolve,
    incidentReassign,
    incidentNoteCreate,
    // service
    serviceList,
    serviceGet,
    // schedule / on-call
    scheduleList,
    scheduleGet,
    oncallList,
    // escalation policy
    escalationPolicyList,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

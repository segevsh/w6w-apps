/**
 * Better Stack — the Uptime API (`uptime.betterstack.com`): monitors,
 * heartbeats, incidents, on-call calendars and status pages.
 *
 * Every path, verb, query parameter and body field here was read on 2026-10-06
 * from Better Stack's own API reference (the `.md` variant of each page under
 * `betterstack.com/docs/uptime/api/`) and probed live. The findings that shaped
 * the design:
 *
 *  1. **The documented host is not the host this app calls.** The reference and
 *     every `pagination.next` URL say `incidents.betterstack.com`;
 *     `uptime.betterstack.com` serves the same routes. One host is declared and
 *     pagination uses `page` numbers, never the vendor's next-URL (`lib/client.ts`).
 *  2. **Two API versions.** Incidents and escalation policies are `/api/v3`, the
 *     rest `/api/v2`.
 *  3. **A monitor read can return secrets the user typed into it** — a proxy
 *     `user:pass@host`, Playwright environment variables, an `Authorization`
 *     request header. They are redacted before an Action returns.
 *  4. **The status page is Better Stack's own JSON:API schema, not Atlassian's,**
 *     and it rolls the separate Telemetry product into its aggregate, so the
 *     health check reads per-resource status for the Uptime sections only.
 *  5. **Not everything documented lives on this host.** Usage, team members and
 *     roles are on `betterstack.com` and need a global token; they are left out.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import monitorList from "./actions/monitor-list.ts";
import monitorGet from "./actions/monitor-get.ts";
import monitorCreate from "./actions/monitor-create.ts";
import monitorUpdate from "./actions/monitor-update.ts";
import monitorDelete from "./actions/monitor-delete.ts";
import monitorAvailabilityGet from "./actions/monitor-availability-get.ts";
import monitorResponseTimesGet from "./actions/monitor-response-times-get.ts";
import monitorGroupList from "./actions/monitor-group-list.ts";
import heartbeatList from "./actions/heartbeat-list.ts";
import heartbeatGet from "./actions/heartbeat-get.ts";
import heartbeatCreate from "./actions/heartbeat-create.ts";
import heartbeatUpdate from "./actions/heartbeat-update.ts";
import heartbeatDelete from "./actions/heartbeat-delete.ts";
import heartbeatAvailabilityGet from "./actions/heartbeat-availability-get.ts";
import incidentList from "./actions/incident-list.ts";
import incidentGet from "./actions/incident-get.ts";
import incidentCreate from "./actions/incident-create.ts";
import incidentAcknowledge from "./actions/incident-acknowledge.ts";
import incidentResolve from "./actions/incident-resolve.ts";
import incidentReopen from "./actions/incident-reopen.ts";
import incidentTimelineGet from "./actions/incident-timeline-get.ts";
import incidentCommentList from "./actions/incident-comment-list.ts";
import onCallList from "./actions/on-call-list.ts";
import onCallEventsList from "./actions/on-call-events-list.ts";
import escalationPolicyList from "./actions/escalation-policy-list.ts";
import severityList from "./actions/severity-list.ts";
import statusPageList from "./actions/status-page-list.ts";
import statusPageGet from "./actions/status-page-get.ts";
import statusReportList from "./actions/status-report-list.ts";
import statusPageResourceList from "./actions/status-page-resource-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    monitorList,
    monitorGet,
    monitorCreate,
    monitorUpdate,
    monitorDelete,
    monitorAvailabilityGet,
    monitorResponseTimesGet,
    monitorGroupList,
    heartbeatList,
    heartbeatGet,
    heartbeatCreate,
    heartbeatUpdate,
    heartbeatDelete,
    heartbeatAvailabilityGet,
    incidentList,
    incidentGet,
    incidentCreate,
    incidentAcknowledge,
    incidentResolve,
    incidentReopen,
    incidentTimelineGet,
    incidentCommentList,
    onCallList,
    onCallEventsList,
    escalationPolicyList,
    severityList,
    statusPageList,
    statusPageGet,
    statusReportList,
    statusPageResourceList,
  ],
  // One token, sent as a bearer header. The reference mentions an "OAuth token"
  // once (Create Incident's requester_email) but documents no OAuth flow, so
  // API tokens are the only method declared.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

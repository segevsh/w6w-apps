/**
 * Sentry — issue triage, event inspection, and release/deploy tracking against
 * Sentry's Web API (`/api/0`, rooted at the install's own base URL).
 *
 * Every endpoint, parameter, required body field and scope in this app was
 * taken from Sentry's own OpenAPI schema
 * (https://github.com/getsentry/sentry-api-schema, `openapi-derefed.json`,
 * fetched 2026-08-18 — 137 paths), and cross-checked against n8n's `Sentry.io`
 * node for the resources a workflow author actually reaches for (Event, Issue,
 * Organization, Project, Release, Team). Pagination follows the Link-header
 * contract documented at https://docs.sentry.io/api/pagination/.
 *
 * Deliberately out of scope:
 *   - **Write access to organizations, teams and members** (`PUT
 *     /organizations/{org}/`, `POST /organizations/{org}/teams/`, the member
 *     mutation endpoints). They are account administration, not the automation
 *     surface this app is for, and each needs an `org:admin`-class scope that
 *     would widen what every Connection must grant.
 *   - **DSN-authenticated ingestion** (the store/envelope endpoints). Sentry's
 *     schema lists a separate `dsn` security scheme for these; sending events
 *     is an SDK's job, not an integration's.
 *   - **Discover/metrics querying** (`/events/`, `/events-timeseries/`,
 *     `/sessions/`). Real, but they take Discover query syntax whose fields
 *     depend on the org's own event schema — a form with a free-text query box
 *     would promise more than it can validate.
 *   - **Bulk issue mutation** (`PUT /projects/{org}/{project}/issues/?id=…`).
 *     The single-issue endpoint covers the triage case; the bulk form's
 *     repeated-`id` query encoding is easy to get subtly wrong from a form.
 */
import type { AppDefinition } from "@w6w/types";
import authToken from "./auth/auth-token.ts";
import oauth2 from "./auth/oauth2.ts";

import issueList from "./actions/issue-list.ts";
import issueGet from "./actions/issue-get.ts";
import issueUpdate from "./actions/issue-update.ts";
import issueDelete from "./actions/issue-delete.ts";
import issueEventList from "./actions/issue-event-list.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import releaseList from "./actions/release-list.ts";
import releaseGet from "./actions/release-get.ts";
import releaseCreate from "./actions/release-create.ts";
import releaseUpdate from "./actions/release-update.ts";
import deployList from "./actions/deploy-list.ts";
import deployCreate from "./actions/deploy-create.ts";
import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";
import teamList from "./actions/team-list.ts";
import memberList from "./actions/member-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    // issue
    issueList,
    issueGet,
    issueUpdate,
    issueDelete,
    issueEventList,
    // event
    eventList,
    eventGet,
    // project
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    // release
    releaseList,
    releaseGet,
    releaseCreate,
    releaseUpdate,
    // deploy
    deployList,
    deployCreate,
    // organization / team / member
    organizationList,
    organizationGet,
    teamList,
    memberList,
  ],
  auth: [authToken, oauth2],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;

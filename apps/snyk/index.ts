/**
 * Snyk — read the issues, projects, targets and SBOMs behind an organization's
 * security posture.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI document **Snyk serves from its own API host**
 * (`https://api.snyk.io/rest/openapi/2026-03-25`, "Snyk API", 192 paths,
 * fetched 2026-08-18) — the strongest provenance available, since the vendor's
 * live API publishes it.
 *
 * Three things about this API shape the whole app:
 *
 *   - **Every request must name a version.** Snyk's API is date-versioned and
 *     `version` is a *required query parameter* on **253 of the 290
 *     operations**; `GET /openapi` listed 323 versions when this was written.
 *     That is deliberate on Snyk's part — you pin a date and migrate when you
 *     choose — so this app pins one (`DEFAULT_VERSION`), stamps it on every
 *     request from one place, and lets a Connection override it. It does not
 *     track "latest", which would change response shapes under a running
 *     workflow.
 *   - **It is JSON:API.** Reads answer `{data, jsonapi, links}` with the real
 *     content under `data[].attributes`; writes take
 *     `{data: {id, type, attributes}}` and the media type
 *     `application/vnd.api+json`, which Snyk enforces. Pagination follows
 *     `links.next`, whose cursor is `starting_after`.
 *   - **Project, target, org, group.** A *target* is a repository; a *project*
 *     is one scanned manifest inside it, so one repo with three lockfiles is
 *     three projects. An *org* owns targets; a *group* owns orgs, which is why
 *     `issue-list-group` exists alongside `issue-list`.
 *
 * Deliberately out of scope:
 *   - **Service accounts and app secrets** (`/orgs/{id}/service_accounts`,
 *     `.../secrets`, `/self/personal_access_tokens`). These mint and rotate
 *     live credentials, which an action would write into step output and run
 *     logs.
 *   - **Broker deployments and connections** (`/tenants/{id}/brokers/*`) —
 *     on-premise connector plumbing, a large surface with its own vocabulary.
 *   - **The asset inventory and Snyk Learn** (`/…/inventory/assets`,
 *     `/learn/*`) — each a coherent product surface deserving its own action
 *     set.
 *   - **Async export and test jobs** (`/…/export`, `/…/tests`,
 *     `/…/sbom_tests`). Each is a create-poll-fetch trio whose results are
 *     large files; worth doing deliberately rather than sampling here.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import issueList from "./actions/issue-list.ts";
import issueGet from "./actions/issue-get.ts";
import issueListGroup from "./actions/issue-list-group.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";
import projectSbomGet from "./actions/project-sbom-get.ts";
import targetList from "./actions/target-list.ts";
import targetGet from "./actions/target-get.ts";
import targetDelete from "./actions/target-delete.ts";
import orgList from "./actions/org-list.ts";
import orgGet from "./actions/org-get.ts";
import groupList from "./actions/group-list.ts";
import selfGet from "./actions/self-get.ts";
import packageIssuesGet from "./actions/package-issues-get.ts";
import packageIssuesList from "./actions/package-issues-list.ts";
import auditLogList from "./actions/audit-log-list.ts";
import collectionList from "./actions/collection-list.ts";
import collectionProjectList from "./actions/collection-project-list.ts";

import service from "./health/service.ts";
import apiVersion from "./health/api-version.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // issue
    issueList,
    issueGet,
    issueListGroup,
    // project
    projectList,
    projectGet,
    projectUpdate,
    projectDelete,
    projectSbomGet,
    // target
    targetList,
    targetGet,
    targetDelete,
    // org / group / self
    orgList,
    orgGet,
    groupList,
    selfGet,
    // package intelligence
    packageIssuesGet,
    packageIssuesList,
    // audit + collections
    auditLogList,
    collectionList,
    collectionProjectList,
  ],
  auth: [apiToken],
  healthChecks: [service, apiVersion, quota],
} satisfies AppDefinition;

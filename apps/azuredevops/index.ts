/**
 * Azure DevOps — work an organization: repositories and pull requests, pipeline
 * runs and their artifacts, and work items queried with WIQL.
 *
 * See `lib/client.ts` for the three things that shape every action — a rejected
 * credential answers `302` rather than `401`, `api-version` is required on
 * every request, and work items take a JSON Patch document rather than an
 * object.
 */
import type { AppDefinition } from "@w6w/types";

import pat from "./auth/pat.ts";

import service from "./health/service.ts";
import organization from "./health/organization.ts";
import quota from "./health/quota.ts";

import projectList from "./actions/project-list.ts";
import repositoryList from "./actions/repository-list.ts";
import repositoryGet from "./actions/repository-get.ts";
import branchList from "./actions/branch-list.ts";
import commitList from "./actions/commit-list.ts";
import pullRequestList from "./actions/pull-request-list.ts";
import pullRequestGet from "./actions/pull-request-get.ts";
import pullRequestCreate from "./actions/pull-request-create.ts";
import pullRequestThreadCreate from "./actions/pull-request-thread-create.ts";
import buildList from "./actions/build-list.ts";
import buildGet from "./actions/build-get.ts";
import buildQueue from "./actions/build-queue.ts";
import buildCancel from "./actions/build-cancel.ts";
import buildDefinitionList from "./actions/build-definition-list.ts";
import buildArtifactList from "./actions/build-artifact-list.ts";
import workItemGet from "./actions/work-item-get.ts";
import workItemCreate from "./actions/work-item-create.ts";
import workItemUpdate from "./actions/work-item-update.ts";
import workItemQuery from "./actions/work-item-query.ts";

const app: AppDefinition = {
  actions: [
    projectList,
    repositoryList,
    repositoryGet,
    branchList,
    commitList,
    pullRequestList,
    pullRequestGet,
    pullRequestCreate,
    pullRequestThreadCreate,
    buildList,
    buildGet,
    buildQueue,
    buildCancel,
    buildDefinitionList,
    buildArtifactList,
    workItemGet,
    workItemCreate,
    workItemUpdate,
    workItemQuery,
  ],
  auth: [pat],
  healthChecks: [service, organization, quota],
};

export default app;

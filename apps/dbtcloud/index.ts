/**
 * dbt Cloud — trigger and watch the builds that produce a warehouse's tables,
 * and read the projects, environments and access behind them.
 *
 * See `lib/client.ts` for the API's shape (per-account host, two live versions,
 * enveloped responses) and `README.md` for the distinctions that decide whether
 * a workflow built on it is correct — chiefly that a trigger returns a QUEUED
 * run rather than a finished build, and that `job-rerun` means two different
 * things depending on state you did not check.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";
import quota from "./health/quota.ts";

import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobRun from "./actions/job-run.ts";
import jobRerun from "./actions/job-rerun.ts";
import runList from "./actions/run-list.ts";
import runGet from "./actions/run-get.ts";
import runCancel from "./actions/run-cancel.ts";
import runRetry from "./actions/run-retry.ts";
import runRetryDetails from "./actions/run-retry-details.ts";
import runStepGet from "./actions/run-step-get.ts";
import runArtifactList from "./actions/run-artifact-list.ts";
import runArtifactGet from "./actions/run-artifact-get.ts";
import jobArtifactGet from "./actions/job-artifact-get.ts";
import accountList from "./actions/account-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import environmentList from "./actions/environment-list.ts";
import environmentVariableList from "./actions/environment-variable-list.ts";
import connectionList from "./actions/connection-list.ts";
import userList from "./actions/user-list.ts";
import groupList from "./actions/group-list.ts";
import serviceTokenList from "./actions/service-token-list.ts";
import auditLogList from "./actions/audit-log-list.ts";

const app: AppDefinition = {
  actions: [
    jobList,
    jobGet,
    jobRun,
    jobRerun,
    runList,
    runGet,
    runCancel,
    runRetry,
    runRetryDetails,
    runStepGet,
    runArtifactList,
    runArtifactGet,
    jobArtifactGet,
    accountList,
    projectList,
    projectGet,
    environmentList,
    environmentVariableList,
    connectionList,
    userList,
    groupList,
    serviceTokenList,
    auditLogList,
  ],
  auth: [token],
  healthChecks: [service, account, quota],
};

export default app;

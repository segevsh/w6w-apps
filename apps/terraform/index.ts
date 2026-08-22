/**
 * HCP Terraform (and Terraform Enterprise, which is the same API self-hosted)
 * — list workspaces, queue and confirm runs, read state outputs, and manage
 * the variables runs execute with.
 *
 * See `lib/client.ts` for what shapes the app: it is JSON:API, attribute names
 * are kebab-case, an unrecognised attribute is ignored rather than rejected,
 * `include` sideloads instead of nesting, and the rate limit is per second.
 *
 * The actions that change infrastructure — `run-create` without plan-only,
 * `run-apply`, and a destroy run — are gated, because a single call against an
 * auto-apply workspace changes real infrastructure with nothing in between.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

import accountGet from "./actions/account-get.ts";
import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceGet from "./actions/workspace-get.ts";
import workspaceCreate from "./actions/workspace-create.ts";
import workspaceUpdate from "./actions/workspace-update.ts";
import workspaceLock from "./actions/workspace-lock.ts";
import workspaceUnlock from "./actions/workspace-unlock.ts";
import workspaceDelete from "./actions/workspace-delete.ts";
import runCreate from "./actions/run-create.ts";
import runGet from "./actions/run-get.ts";
import runList from "./actions/run-list.ts";
import runApply from "./actions/run-apply.ts";
import runDiscard from "./actions/run-discard.ts";
import runCancel from "./actions/run-cancel.ts";
import stateOutputs from "./actions/state-outputs.ts";
import variableList from "./actions/variable-list.ts";
import variableSet from "./actions/variable-set.ts";
import variableDelete from "./actions/variable-delete.ts";

const app: AppDefinition = {
  actions: [
    accountGet,
    organizationList,
    organizationGet,
    workspaceList,
    workspaceGet,
    workspaceCreate,
    workspaceUpdate,
    workspaceLock,
    workspaceUnlock,
    workspaceDelete,
    runCreate,
    runGet,
    runList,
    runApply,
    runDiscard,
    runCancel,
    stateOutputs,
    variableList,
    variableSet,
    variableDelete,
  ],
  auth: [token],
  healthChecks: [service, instance, quota],
};

export default app;

/**
 * GitLab — w6w port of n8n's `Gitlab` node (REST API v4).
 *
 * Covers the project, issue, merge request, repository file, release and user
 * resources against GitLab.com or a self-managed instance (the instance URL is
 * a per-connection field on the access-token method — see `auth/access-token.ts`).
 *
 * Two things are deliberately out of scope:
 *
 *   - **The push/tag webhook trigger** (n8n's `GitlabTrigger`). That is a
 *     Trigger, not an Action; port it against `rfcs/trigger.md` when this pack
 *     takes on triggers.
 *   - **Self-managed OAuth.** The OAuth authorization/token endpoints are fixed
 *     to GitLab.com; a self-managed instance runs its own OAuth server. Use the
 *     access-token method (with its `baseUrl` field) to target self-managed.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import projectGet from "./actions/project-get.ts";
import projectGetMany from "./actions/project-get-many.ts";
import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueGetMany from "./actions/issue-get-many.ts";
import issueEdit from "./actions/issue-edit.ts";
import issueClose from "./actions/issue-close.ts";
import mergeRequestCreate from "./actions/merge-request-create.ts";
import mergeRequestGet from "./actions/merge-request-get.ts";
import mergeRequestGetMany from "./actions/merge-request-get-many.ts";
import fileGet from "./actions/file-get.ts";
import fileCreate from "./actions/file-create.ts";
import fileUpdate from "./actions/file-update.ts";
import releaseCreate from "./actions/release-create.ts";
import releaseGetMany from "./actions/release-get-many.ts";
import userGetCurrent from "./actions/user-get-current.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // project
    projectGet,
    projectGetMany,
    // issue
    issueCreate,
    issueGet,
    issueGetMany,
    issueEdit,
    issueClose,
    // merge request
    mergeRequestCreate,
    mergeRequestGet,
    mergeRequestGetMany,
    // repository file
    fileGet,
    fileCreate,
    fileUpdate,
    // release
    releaseCreate,
    releaseGetMany,
    // user
    userGetCurrent,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

/**
 * Jira Cloud — w6w port of n8n's `Jira` node (REST API v3).
 *
 * Covers the issue, comment, user and project resources. Three things shape
 * the code and are worth reading before changing it:
 *
 *   - **Two different base URLs.** An API-token connection talks to the site
 *     host (`acme.atlassian.net`); an OAuth connection talks to Atlassian's
 *     gateway (`api.atlassian.com/ex/jira/{cloudId}`). Both auth methods record
 *     what they need on the connection's `display` in `afterConnect`, and
 *     `lib/client.ts` picks the right base from there. The allowlist carries
 *     `*.atlassian.net` because no manifest can enumerate customer sites.
 *   - **v3 rich text is ADF.** `description` and comment bodies must be
 *     Atlassian Document Format objects, not strings. `adf()` wraps the plain
 *     text a user types; an object passes through untouched.
 *   - **Status is not writable.** It changes only by executing a workflow
 *     transition, and the available transitions depend on the current status —
 *     hence `issue-get-transitions` feeding `issue-transition`.
 *
 * Deliberately absent: Jira Server / Data Center (n8n's `JiraSoftwareServerApi`
 * — a different, self-hosted host the static allowlist cannot cover),
 * attachments (multipart upload, which the sandbox's `ctx.fetch` is not for),
 * and the webhook trigger.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueUpdate from "./actions/issue-update.ts";
import issueDelete from "./actions/issue-delete.ts";
import issueSearch from "./actions/issue-search.ts";
import issueTransition from "./actions/issue-transition.ts";
import issueGetTransitions from "./actions/issue-get-transitions.ts";
import issueAssign from "./actions/issue-assign.ts";

import commentAdd from "./actions/comment-add.ts";
import commentGetMany from "./actions/comment-get-many.ts";
import commentDelete from "./actions/comment-delete.ts";

import userSearch from "./actions/user-search.ts";
import userGet from "./actions/user-get.ts";

import projectGetMany from "./actions/project-get-many.ts";
import projectGet from "./actions/project-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    // issue
    issueCreate,
    issueGet,
    issueUpdate,
    issueDelete,
    issueSearch,
    issueTransition,
    issueGetTransitions,
    issueAssign,
    // comment
    commentAdd,
    commentGetMany,
    commentDelete,
    // user
    userSearch,
    userGet,
    // project
    projectGetMany,
    projectGet,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;

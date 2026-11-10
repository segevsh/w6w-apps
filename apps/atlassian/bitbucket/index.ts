import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import accessToken from "./auth/access-token.ts";
import getUser from "./actions/get-user.ts";
import listWorkspaces from "./actions/list-workspaces.ts";
import listRepositories from "./actions/list-repositories.ts";
import getRepository from "./actions/get-repository.ts";
import listWorkspaceEvents from "./actions/list-workspace-events.ts";
import listRepositoryEvents from "./actions/list-repository-events.ts";
import listWorkspaceHooks from "./actions/list-workspace-hooks.ts";
import createWorkspaceHook from "./actions/create-workspace-hook.ts";
import deleteWorkspaceHook from "./actions/delete-workspace-hook.ts";
import listRepositoryHooks from "./actions/list-repository-hooks.ts";
import createRepositoryHook from "./actions/create-repository-hook.ts";
import deleteRepositoryHook from "./actions/delete-repository-hook.ts";
import push from "./triggers/push.ts";
import pullRequestCreated from "./triggers/pull-request-created.ts";
import pullRequestUpdated from "./triggers/pull-request-updated.ts";
import pullRequestMerged from "./triggers/pull-request-merged.ts";
import pullRequestDeclined from "./triggers/pull-request-declined.ts";
import pullRequestComment from "./triggers/pull-request-comment.ts";
import issueCreated from "./triggers/issue-created.ts";
import anyEvent from "./triggers/any-event.ts";
import issueUpdated from "./triggers/issue-updated.ts";
import issueCommentCreated from "./triggers/issue-comment-created.ts";
import pullRequestApproved from "./triggers/pull-request-approved.ts";
import pullRequestChangesRequested from "./triggers/pull-request-changes-requested.ts";
import repoFork from "./triggers/repo-fork.ts";
import repoUpdated from "./triggers/repo-updated.ts";
import commitStatusCreated from "./triggers/commit-status-created.ts";
import commitStatusUpdated from "./triggers/commit-status-updated.ts";
import newRepository from "./triggers/new-repository.ts";
import newOrUpdatedRepository from "./triggers/new-or-updated-repository.ts";
import newWorkspace from "./triggers/new-workspace.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getUser,
    listWorkspaces,
    listRepositories,
    getRepository,
    listWorkspaceEvents,
    listRepositoryEvents,
    listWorkspaceHooks,
    createWorkspaceHook,
    deleteWorkspaceHook,
    listRepositoryHooks,
    createRepositoryHook,
    deleteRepositoryHook,
  ],
  triggers: [
    push,
    pullRequestCreated,
    pullRequestUpdated,
    pullRequestMerged,
    pullRequestDeclined,
    pullRequestComment,
    issueCreated,
    anyEvent,
    issueUpdated,
    issueCommentCreated,
    pullRequestApproved,
    pullRequestChangesRequested,
    repoFork,
    repoUpdated,
    commitStatusCreated,
    commitStatusUpdated,
    newRepository,
    newOrUpdatedRepository,
    newWorkspace,
  ],
  auth: [basic, accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;

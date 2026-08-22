/**
 * Gitea — repositories, issues, pull requests, releases and files, on whichever
 * instance you run.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the Swagger 2.0 document a Gitea instance serves from its own root
 * (`/swagger.v1.json`; read from `gitea.com` 2026-08-18, engine 1.27.0-dev,
 * 340 paths, `basePath: /api/v1`), and the auth behaviour was measured against
 * the same instance.
 *
 * ## There is no vendor host
 *
 * Gitea is self-hosted by design — `gitea.com` is one instance among many, and
 * most are private. So the base URL is a connection field and the egress
 * allowlist is `["*"]`, the posture this pack already uses for `mattermost`,
 * `ghost`, `grafana` and `jenkins`. It is deliberately wide, and it is the
 * price of an app whose server address only the operator knows.
 *
 * A happy consequence: the document ships **with the instance**, so it
 * describes exactly the version in front of you. That is why `instance` health
 * reports the version it found — when an action 404s on one server and works on
 * another, that is the answer.
 *
 * ## The scheme word is `token`, not `Bearer`
 *
 * Gitea's own security definition says so, and sending `Bearer` fails like a
 * wrong token — `401 {"message":"token is required"}` — so it reads as a
 * credential problem rather than a scheme one. The two alternatives are
 * declined on purpose: `access_token` as a **query parameter** is marked for
 * removal in Gitea 1.23 and puts a credential in every proxy log between here
 * and the server, and basic auth means handing a workflow the account password
 * instead of a revocable token.
 *
 * ## Five things that go wrong quietly
 *
 *   - **An issue list contains pull requests.** Gitea models a PR as an issue
 *     with a `pull_request` field, so an unfiltered count of "open issues"
 *     silently includes every open PR. `issue-list` defaults to issues only and
 *     says why; `pull-request-list` is the honest way to count the other.
 *   - **Labels are numeric ids when writing and names when reading.**
 *     `issue-create` takes `labels: [3, 7]`; `issue-list` filters by name. This
 *     app validates the write side rather than letting `["bug"]` become a
 *     confusing 422, and `label-list` is where the ids come from.
 *   - **A file write needs the blob sha of what it replaces.** That is an
 *     optimistic-concurrency guard: without the current sha Gitea refuses
 *     rather than clobbering a change that landed in between. Nobody has that
 *     sha to hand, so `file-write` and `file-delete` fetch it — one extra read
 *     for a write that cannot silently overwrite someone else's commit.
 *   - **`mergeable` is `null` while Gitea is still computing it.** Reading a
 *     pull request immediately after creating it gives neither true nor false,
 *     and treating `null` as "not mergeable" refuses perfectly good PRs.
 *   - **The latest release is not the first row of the list.** `release-list`
 *     includes drafts and prereleases; `/releases/latest` deliberately skips
 *     both. A "what is live" workflow reading the list can report an
 *     unpublished draft.
 *
 * ## Where the destructive verbs live
 *
 * `repo-delete` is the sharpest call here and the one thing in a Git workflow
 * that a clone does not bring back — the issues, pull requests, releases and
 * wiki are not in anyone's local copy. It requires an explicit confirmation
 * *and* refuses to resolve the repository from the connection's default owner,
 * because a bare name plus a stale default is exactly how the wrong repository
 * gets deleted. `file-delete` also confirms; `pull-request-merge`'s
 * `force_merge` — which merges past failing checks and branch protection — is
 * off by default and logged at `warn` when used.
 *
 * Deliberately out of scope:
 *   - **`force_push` on file writes.** Gitea accepts it; it is the one flag
 *     here that discards history rather than adding to it, and a workflow step
 *     is not where that decision belongs.
 *   - **The `Sudo` header.** Gitea lets an admin act as any user. Impersonation
 *     from an unattended workflow is not something this app should make easy.
 *   - **Admin, mirrors, LFS, packages, wikis and Gitea Actions.** Each is its
 *     own surface; the 340 paths here are mostly not about the daily loop of
 *     issues, reviews and releases.
 *   - **Webhooks.** Configuring where Gitea pushes events belongs with whatever
 *     receives them.
 */
import type { AppDefinition } from "@w6w/types";
import token from "./auth/token.ts";

import repoSearch from "./actions/repo-search.ts";
import repoGet from "./actions/repo-get.ts";
import repoCreate from "./actions/repo-create.ts";
import repoDelete from "./actions/repo-delete.ts";
import orgRepoList from "./actions/org-repo-list.ts";
import issueList from "./actions/issue-list.ts";
import issueGet from "./actions/issue-get.ts";
import issueCreate from "./actions/issue-create.ts";
import issueEdit from "./actions/issue-edit.ts";
import issueCommentList from "./actions/issue-comment-list.ts";
import issueCommentCreate from "./actions/issue-comment-create.ts";
import pullRequestList from "./actions/pull-request-list.ts";
import pullRequestGet from "./actions/pull-request-get.ts";
import pullRequestCreate from "./actions/pull-request-create.ts";
import pullRequestMerge from "./actions/pull-request-merge.ts";
import fileGet from "./actions/file-get.ts";
import fileWrite from "./actions/file-write.ts";
import fileDelete from "./actions/file-delete.ts";
import branchList from "./actions/branch-list.ts";
import commitList from "./actions/commit-list.ts";
import tagList from "./actions/tag-list.ts";
import labelList from "./actions/label-list.ts";
import releaseList from "./actions/release-list.ts";
import releaseGetLatest from "./actions/release-get-latest.ts";
import releaseCreate from "./actions/release-create.ts";
import userGet from "./actions/user-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // repositories
    repoSearch,
    repoGet,
    repoCreate,
    repoDelete,
    orgRepoList,
    // issues
    issueList,
    issueGet,
    issueCreate,
    issueEdit,
    issueCommentList,
    issueCommentCreate,
    // pull requests
    pullRequestList,
    pullRequestGet,
    pullRequestCreate,
    pullRequestMerge,
    // files
    fileGet,
    fileWrite,
    fileDelete,
    // the git objects around them
    branchList,
    commitList,
    tagList,
    labelList,
    // releases
    releaseList,
    releaseGetLatest,
    releaseCreate,
    // who this is
    userGet,
  ],
  auth: [token],
  healthChecks: [instance, service],
} satisfies AppDefinition;

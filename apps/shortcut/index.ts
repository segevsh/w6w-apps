/**
 * Shortcut — the project-management tool built around Stories, Epics,
 * Iterations, Workflows and Labels, formerly known as Clubhouse — over the
 * Shortcut REST API v3 (`api.app.shortcut.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-15 against Shortcut's own OpenAPI 3.0 document
 * (`developer.shortcut.com/api/rest/v3/shortcut.openapi.json`, 568,325 bytes,
 * `info.title` "Shortcut API 3.0") plus live probes against
 * `api.app.shortcut.com` and `status.shortcut.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two id spaces, easy to cross** (`lib/client.ts`, `lib/params.ts`).
 *     Stories, Epics, Iterations, Labels, Projects and Workflows are all
 *     addressed by a plain integer; Members are addressed by UUID instead.
 *     A Project's `team_id` (the legacy field name for a "Group") is *also*
 *     an integer, distinct from the `group_id` UUID that Stories, Epics and
 *     Iterations use to reference the same Group.
 *  2. **No response envelope, but no single list shape either.** Every read
 *     returns the resource JSON directly — no `{"data": …}` wrapper — but
 *     `GET /epics/paginated` answers `{data, next, total}`, `POST
 *     /stories/search` answers a bare unbounded array, and `GET /search`
 *     answers per-entity-type result sets each with their own cursor.
 *  3. **Errors are `{"message", "tag"}`, verified live.** An unauthenticated
 *     request answers `401 {"tag":"organization2_missing",...}`; a wrong
 *     token answers `401 {"tag":"unauthorized",...}` — two different
 *     problems, distinguished in `auth/api-token.ts`'s `test` hook.
 *  4. **Iteration dates are dates, not timestamps.** `start_date`/`end_date`
 *     are plain `YYYY-MM-DD` strings, unlike every other date field in this
 *     API (`deadline`, `plannedStartDate`, …), which are full timestamps.
 *  5. **The legacy `clubhouse.io` hostname is still alive, as a redirect.**
 *     `status.clubhouse.io` resolves and forwards to `status.shortcut.com`;
 *     no `clubhouse.io` hostname appears anywhere in the current API or auth
 *     flow, so nothing needs to be allowlisted for it. See `README.md`.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import memberGet from "./actions/member-get.ts";
import memberList from "./actions/member-list.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";

import epicList from "./actions/epic-list.ts";
import epicGet from "./actions/epic-get.ts";
import epicCreate from "./actions/epic-create.ts";
import epicUpdate from "./actions/epic-update.ts";
import epicDelete from "./actions/epic-delete.ts";
import epicStoriesList from "./actions/epic-stories-list.ts";
import epicCommentList from "./actions/epic-comment-list.ts";
import epicCommentCreate from "./actions/epic-comment-create.ts";

import iterationList from "./actions/iteration-list.ts";
import iterationGet from "./actions/iteration-get.ts";
import iterationCreate from "./actions/iteration-create.ts";
import iterationUpdate from "./actions/iteration-update.ts";
import iterationDelete from "./actions/iteration-delete.ts";
import iterationStoriesList from "./actions/iteration-stories-list.ts";

import workflowList from "./actions/workflow-list.ts";
import workflowGet from "./actions/workflow-get.ts";

import labelList from "./actions/label-list.ts";
import labelGet from "./actions/label-get.ts";
import labelCreate from "./actions/label-create.ts";
import labelUpdate from "./actions/label-update.ts";
import labelDelete from "./actions/label-delete.ts";
import labelStoriesList from "./actions/label-stories-list.ts";

import storyGet from "./actions/story-get.ts";
import storyCreate from "./actions/story-create.ts";
import storyUpdate from "./actions/story-update.ts";
import storyDelete from "./actions/story-delete.ts";
import storySearch from "./actions/story-search.ts";
import storyCommentList from "./actions/story-comment-list.ts";
import storyCommentCreate from "./actions/story-comment-create.ts";

import search from "./actions/search.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Members
    memberGet,
    memberList,
    // Projects
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    // Epics
    epicList,
    epicGet,
    epicCreate,
    epicUpdate,
    epicDelete,
    epicStoriesList,
    epicCommentList,
    epicCommentCreate,
    // Iterations
    iterationList,
    iterationGet,
    iterationCreate,
    iterationUpdate,
    iterationDelete,
    iterationStoriesList,
    // Workflows
    workflowList,
    workflowGet,
    // Labels
    labelList,
    labelGet,
    labelCreate,
    labelUpdate,
    labelDelete,
    labelStoriesList,
    // Stories
    storyGet,
    storyCreate,
    storyUpdate,
    storyDelete,
    storySearch,
    storyCommentList,
    storyCommentCreate,
    // Search
    search,
  ],
  // API token only. Shortcut publishes no OAuth surface for third-party apps.
  auth: [apiToken],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;

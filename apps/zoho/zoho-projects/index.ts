/**
 * Zoho Projects — portals, users, projects, task lists, tasks, milestones, issues and time logs
 * over the V3 REST API (`https://projects.<tld>/api/v3/portal/{portal_id}/...`).
 *
 * Every endpoint, parameter and response shape was read from the vendor's V3 reference
 * (`https://projects.zoho.com/api-docs`) on 2026-10-06. Findings that shaped the design:
 *
 *  1. **V3 only**: the `/restapi/` pages are marked deprecated; V3 uses plain JSON,
 *     `page`/`per_page` pagination with `page_info.has_next_page`, and ISO 8601 dates.
 *  2. **Eleven data centres** (`lib/regions.ts`), one OAuth method each (`auth/oauth2.ts`);
 *     the API host is `projects.<tld>`, not the `www.zohoapis.<tld>` host other Zoho APIs use.
 *  3. **`Authorization: Bearer`** in V3 (older Zoho APIs use `Zoho-oauthtoken`).
 *  4. **Errors are classified by `error.title`** (`INVALID_OAUTHTOKEN`, `INVALID_TICKET`), not
 *     the HTTP status.
 *  5. **Milestones live on `/api/v3.1/.../phases`** (the v3 `/phases` shapes are superseded);
 *     ids are sent as strings because some exceed 2^53.
 *  6. **No quota surface** (`health/quota.ts`) — declared absent.
 *
 * Deliberately absent: the `filter` query (its documented example encodes the parameter name
 * oddly), bulk task/time-log operations, comments, attachments, dependencies, custom fields,
 * users administration, trash/bin, templates, automation — see the README.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import issueCreate from "./actions/issue-create.ts";
import issueDelete from "./actions/issue-delete.ts";
import issueGet from "./actions/issue-get.ts";
import issueList from "./actions/issue-list.ts";
import issueUpdate from "./actions/issue-update.ts";
import milestoneCreate from "./actions/milestone-create.ts";
import milestoneDelete from "./actions/milestone-delete.ts";
import milestoneGet from "./actions/milestone-get.ts";
import milestoneList from "./actions/milestone-list.ts";
import milestoneUpdate from "./actions/milestone-update.ts";
import portalGet from "./actions/portal-get.ts";
import portalList from "./actions/portal-list.ts";
import projectCreate from "./actions/project-create.ts";
import projectGet from "./actions/project-get.ts";
import projectList from "./actions/project-list.ts";
import projectRestore from "./actions/project-restore.ts";
import projectTrash from "./actions/project-trash.ts";
import projectUpdate from "./actions/project-update.ts";
import projectUserList from "./actions/project-user-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskDelete from "./actions/task-delete.ts";
import taskGet from "./actions/task-get.ts";
import taskList from "./actions/task-list.ts";
import taskUpdate from "./actions/task-update.ts";
import tasklistCreate from "./actions/tasklist-create.ts";
import tasklistDelete from "./actions/tasklist-delete.ts";
import tasklistList from "./actions/tasklist-list.ts";
import tasklistUpdate from "./actions/tasklist-update.ts";
import timelogCreate from "./actions/timelog-create.ts";
import timelogGet from "./actions/timelog-get.ts";
import timelogList from "./actions/timelog-list.ts";
import timelogUpdate from "./actions/timelog-update.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // portals
    portalList,
    portalGet,

    // users
    userList,
    userGet,
    projectUserList,

    // projects
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectTrash,
    projectRestore,

    // task lists
    tasklistList,
    tasklistCreate,
    tasklistUpdate,
    tasklistDelete,

    // tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,

    // milestones
    milestoneList,
    milestoneGet,
    milestoneCreate,
    milestoneUpdate,
    milestoneDelete,

    // issues
    issueList,
    issueGet,
    issueCreate,
    issueUpdate,
    issueDelete,

    // time logs
    timelogList,
    timelogGet,
    timelogCreate,
    timelogUpdate,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;

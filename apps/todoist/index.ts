/**
 * Todoist — w6w port of n8n's `Todoist` node (REST API v2).
 *
 * Covers the task, project, section, comment and label resources over
 * `https://api.todoist.com/rest/v2`. Both bearer credential types (the personal
 * API token and OAuth) sign identically, so `lib/client.ts` never touches
 * Authorization — the runtime's `sign` hook does.
 *
 * Deliberately absent from the n8n node: the `move` and `quickAdd` task
 * operations and every reminder operation. Those ride the Sync API
 * (`api.todoist.com/sync/v9`, POST `/sync` command batches) rather than REST
 * v2, a different transport that would pull a second host and command grammar
 * into an otherwise-REST app. Task placement is still expressible at create
 * time via `projectId` / `sectionId` / `parentId`.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskGetMany from "./actions/task-get-many.ts";
import taskUpdate from "./actions/task-update.ts";
import taskClose from "./actions/task-close.ts";
import taskReopen from "./actions/task-reopen.ts";
import taskDelete from "./actions/task-delete.ts";
import projectCreate from "./actions/project-create.ts";
import projectGetMany from "./actions/project-get-many.ts";
import projectDelete from "./actions/project-delete.ts";
import sectionGetMany from "./actions/section-get-many.ts";
import commentCreate from "./actions/comment-create.ts";
import commentGetMany from "./actions/comment-get-many.ts";
import labelGetMany from "./actions/label-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // task
    taskCreate,
    taskGet,
    taskGetMany,
    taskUpdate,
    taskClose,
    taskReopen,
    taskDelete,
    // project
    projectCreate,
    projectGetMany,
    projectDelete,
    // section
    sectionGetMany,
    // comment
    commentCreate,
    commentGetMany,
    // label
    labelGetMany,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskGetMany from "./actions/task-get-many.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import listCreate from "./actions/list-create.ts";
import listGetMany from "./actions/list-get-many.ts";
import folderGetMany from "./actions/folder-get-many.ts";
import commentCreate from "./actions/comment-create.ts";
import commentGetMany from "./actions/comment-get-many.ts";
import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryGetMany from "./actions/time-entry-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    taskCreate,
    taskGet,
    taskGetMany,
    taskUpdate,
    taskDelete,
    listCreate,
    listGetMany,
    folderGetMany,
    commentCreate,
    commentGetMany,
    timeEntryCreate,
    timeEntryGetMany,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

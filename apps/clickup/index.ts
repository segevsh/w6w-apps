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
import taskCreatedTrigger from "./triggers/task-created.ts";
import taskUpdatedTrigger from "./triggers/task-updated.ts";
import taskDeletedTrigger from "./triggers/task-deleted.ts";
import taskCommentPostedTrigger from "./triggers/task-comment-posted.ts";
import taskStatusUpdatedTrigger from "./triggers/task-status-updated.ts";
import taskPriorityUpdatedTrigger from "./triggers/task-priority-updated.ts";
import taskAssigneeUpdatedTrigger from "./triggers/task-assignee-updated.ts";
import taskDueDateUpdatedTrigger from "./triggers/task-due-date-updated.ts";
import taskTagUpdatedTrigger from "./triggers/task-tag-updated.ts";
import taskMovedTrigger from "./triggers/task-moved.ts";
import taskCommentUpdatedTrigger from "./triggers/task-comment-updated.ts";
import taskTimeEstimateUpdatedTrigger from "./triggers/task-time-estimate-updated.ts";
import taskTimeTrackedUpdatedTrigger from "./triggers/task-time-tracked-updated.ts";
import listCreatedTrigger from "./triggers/list-created.ts";
import listUpdatedTrigger from "./triggers/list-updated.ts";
import listDeletedTrigger from "./triggers/list-deleted.ts";
import folderCreatedTrigger from "./triggers/folder-created.ts";
import folderUpdatedTrigger from "./triggers/folder-updated.ts";
import folderDeletedTrigger from "./triggers/folder-deleted.ts";
import anyEventTrigger from "./triggers/any-event.ts";
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
  triggers: [
    taskCreatedTrigger,
    taskUpdatedTrigger,
    taskDeletedTrigger,
    taskCommentPostedTrigger,
    taskStatusUpdatedTrigger,
    taskPriorityUpdatedTrigger,
    taskAssigneeUpdatedTrigger,
    taskDueDateUpdatedTrigger,
    taskTagUpdatedTrigger,
    taskMovedTrigger,
    taskCommentUpdatedTrigger,
    taskTimeEstimateUpdatedTrigger,
    taskTimeTrackedUpdatedTrigger,
    listCreatedTrigger,
    listUpdatedTrigger,
    listDeletedTrigger,
    folderCreatedTrigger,
    folderUpdatedTrigger,
    folderDeletedTrigger,
    anyEventTrigger,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;

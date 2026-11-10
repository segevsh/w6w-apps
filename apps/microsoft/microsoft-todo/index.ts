import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// task list
import listTaskLists from "./actions/list-task-lists.ts";
import getTaskList from "./actions/get-task-list.ts";
import createTaskList from "./actions/create-task-list.ts";
import updateTaskList from "./actions/update-task-list.ts";
import deleteTaskList from "./actions/delete-task-list.ts";
import listTaskListChanges from "./actions/list-task-list-changes.ts";

// task
import listTasks from "./actions/list-tasks.ts";
import getTask from "./actions/get-task.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";
import completeTask from "./actions/complete-task.ts";
import deleteTask from "./actions/delete-task.ts";
import listTaskChanges from "./actions/list-task-changes.ts";

// checklist item (subtask)
import listChecklistItems from "./actions/list-checklist-items.ts";
import createChecklistItem from "./actions/create-checklist-item.ts";
import updateChecklistItem from "./actions/update-checklist-item.ts";
import deleteChecklistItem from "./actions/delete-checklist-item.ts";

// linked resource
import listLinkedResources from "./actions/list-linked-resources.ts";
import createLinkedResource from "./actions/create-linked-resource.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listTaskLists,
    getTaskList,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTaskListChanges,
    listTasks,
    getTask,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    listTaskChanges,
    listChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    listLinkedResources,
    createLinkedResource,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

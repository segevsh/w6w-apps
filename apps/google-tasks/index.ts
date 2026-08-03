import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listTaskLists from "./actions/list-task-lists.ts";
import getTaskList from "./actions/get-task-list.ts";
import createTaskList from "./actions/create-task-list.ts";
import updateTaskList from "./actions/update-task-list.ts";
import deleteTaskList from "./actions/delete-task-list.ts";
import listTasks from "./actions/list-tasks.ts";
import getTask from "./actions/get-task.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";
import completeTask from "./actions/complete-task.ts";
import deleteTask from "./actions/delete-task.ts";
import moveTask from "./actions/move-task.ts";
import clearCompletedTasks from "./actions/clear-completed-tasks.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listTaskLists,
    getTaskList,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTasks,
    getTask,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    moveTask,
    clearCompletedTasks,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;

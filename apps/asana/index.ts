import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

// subtask
import createSubtask from "./actions/create-subtask.ts";
import listSubtasks from "./actions/list-subtasks.ts";

// task
import createTask from "./actions/create-task.ts";
import deleteTask from "./actions/delete-task.ts";
import getTask from "./actions/get-task.ts";
import listTasks from "./actions/list-tasks.ts";
import moveTask from "./actions/move-task.ts";
import updateTask from "./actions/update-task.ts";
import searchTasks from "./actions/search-tasks.ts";

// task comment
import addTaskComment from "./actions/add-task-comment.ts";
import removeTaskComment from "./actions/remove-task-comment.ts";

// task project
import addTaskProject from "./actions/add-task-project.ts";
import removeTaskProject from "./actions/remove-task-project.ts";

// task tag
import addTaskTag from "./actions/add-task-tag.ts";
import removeTaskTag from "./actions/remove-task-tag.ts";

// user
import getUser from "./actions/get-user.ts";
import listUsers from "./actions/list-users.ts";

// project
import createProject from "./actions/create-project.ts";
import deleteProject from "./actions/delete-project.ts";
import getProject from "./actions/get-project.ts";
import listProjects from "./actions/list-projects.ts";
import updateProject from "./actions/update-project.ts";
import newTask from "./triggers/new-task.ts";
import taskUpdated from "./triggers/task-updated.ts";
import taskDeleted from "./triggers/task-deleted.ts";
import newComment from "./triggers/new-comment.ts";
import newProject from "./triggers/new-project.ts";
import projectUpdated from "./triggers/project-updated.ts";
import projectDeleted from "./triggers/project-deleted.ts";
import newUser from "./triggers/new-user.ts";
import anyEvent from "./triggers/any-event.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createSubtask,
    listSubtasks,
    createTask,
    deleteTask,
    getTask,
    listTasks,
    moveTask,
    updateTask,
    searchTasks,
    addTaskComment,
    removeTaskComment,
    addTaskProject,
    removeTaskProject,
    addTaskTag,
    removeTaskTag,
    getUser,
    listUsers,
    createProject,
    deleteProject,
    getProject,
    listProjects,
    updateProject,
  ],
  auth: [accessToken, oauth2],
  triggers: [
    newTask,
    taskUpdated,
    taskDeleted,
    newComment,
    newProject,
    projectUpdated,
    projectDeleted,
    newUser,
    anyEvent,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;

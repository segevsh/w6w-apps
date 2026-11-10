import type { AppDefinition } from "@w6w/types";
import agentConversationList from "./actions/agent-conversation-list.ts";
import agentGet from "./actions/agent-get.ts";
import folderAgentList from "./actions/folder-agent-list.ts";
import folderList from "./actions/folder-list.ts";
import folderMediaList from "./actions/folder-media-list.ts";
import folderProjectList from "./actions/folder-project-list.ts";
import folderTemplateList from "./actions/folder-template-list.ts";
import myProjectList from "./actions/my-project-list.ts";
import projectComplete from "./actions/project-complete.ts";
import projectCopy from "./actions/project-copy.ts";
import projectCreate from "./actions/project-create.ts";
import projectCreateFromTemplate from "./actions/project-create-from-template.ts";
import projectCreateInWorkspace from "./actions/project-create-in-workspace.ts";
import projectFieldList from "./actions/project-field-list.ts";
import projectGet from "./actions/project-get.ts";
import projectMemberList from "./actions/project-member-list.ts";
import projectRestore from "./actions/project-restore.ts";
import projectShareLinkGet from "./actions/project-share-link-get.ts";
import taskAssigneeList from "./actions/task-assignee-list.ts";
import taskAssigneeSet from "./actions/task-assignee-set.ts";
import taskComplete from "./actions/task-complete.ts";
import taskCreate from "./actions/task-create.ts";
import taskDateDelete from "./actions/task-date-delete.ts";
import taskDateGet from "./actions/task-date-get.ts";
import taskDateSet from "./actions/task-date-set.ts";
import taskDelete from "./actions/task-delete.ts";
import taskGet from "./actions/task-get.ts";
import taskList from "./actions/task-list.ts";
import taskMove from "./actions/task-move.ts";
import taskNoteDelete from "./actions/task-note-delete.ts";
import taskNoteGet from "./actions/task-note-get.ts";
import taskNoteSet from "./actions/task-note-set.ts";
import taskUncomplete from "./actions/task-uncomplete.ts";
import taskUpdate from "./actions/task-update.ts";
import workspaceList from "./actions/workspace-list.ts";
import personalToken from "./auth/personal-token.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * Taskade — workspaces, folders, projects, tasks and AI agents over the REST API v1.
 * Findings that shaped this app (2026-10-06) are in `lib/client.ts` and the README.
 */
const app: AppDefinition = {
  actions: [
    agentConversationList,
    agentGet,
    folderAgentList,
    folderList,
    folderMediaList,
    folderProjectList,
    folderTemplateList,
    myProjectList,
    projectComplete,
    projectCopy,
    projectCreate,
    projectCreateFromTemplate,
    projectCreateInWorkspace,
    projectFieldList,
    projectGet,
    projectMemberList,
    projectRestore,
    projectShareLinkGet,
    taskAssigneeList,
    taskAssigneeSet,
    taskComplete,
    taskCreate,
    taskDateDelete,
    taskDateGet,
    taskDateSet,
    taskDelete,
    taskGet,
    taskList,
    taskMove,
    taskNoteDelete,
    taskNoteGet,
    taskNoteSet,
    taskUncomplete,
    taskUpdate,
    workspaceList,
  ],
  auth: [personalToken],
  healthChecks: [service, api, quota],
};

export default app;

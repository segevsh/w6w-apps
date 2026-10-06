import { writeAction } from "../lib/factory.ts";

/** `PATCH /Projects/{projectID}/Tasks` — change only the fields sent. */
export default writeAction({
  key: "project-task-update",
  title: "Update project task",
  description: "Change the fields you send on a project task (PATCH). Needs the task's project id.",
  resource: "task",
  method: "PATCH",
  path: (projectId) => `/Projects/${projectId}/Tasks`,
  parent: { key: "projectID", label: "Project ID", type: "number" },
  fields: [
    { key: "title", label: "Title", type: "string" },
    { key: "status", label: "Status (picklist id)", type: "number" },
    { key: "taskType", label: "Task type (picklist id)", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "assignedResourceID", label: "Assigned resource ID", type: "number" },
    { key: "assignedResourceRoleID", label: "Assigned resource role ID", type: "number" },
    { key: "phaseID", label: "Phase ID", type: "number" },
    { key: "startDateTime", label: "Start", type: "datetime" },
    { key: "endDateTime", label: "End", type: "datetime" },
    { key: "estimatedHours", label: "Estimated hours", type: "number" },
    { key: "priority", label: "Priority", type: "number" },
    { key: "billingCodeID", label: "Work type (billing code) ID", type: "number" },
    { key: "departmentID", label: "Department ID", type: "number" },
  ],
});

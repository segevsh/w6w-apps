import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Projects/{projectID}/Tasks` — add a task to a project.
 *
 * Tasks have no root `POST` in the swagger; create and update live under the parent project. The
 * vendor's Tasks page marks `projectID`, `status`, `taskType` and `title` required.
 * `billingCodeID` and `departmentID` become required only when the task has a primary or
 * secondary resource assigned. `priority` defaults to 0 when omitted.
 */
export default writeAction({
  key: "project-task-create",
  title: "Create project task",
  description:
    "Add a task to a project. `status` and `taskType` are picklist ids; a billing code and " +
    "department are required once a resource is assigned.",
  resource: "task",
  method: "POST",
  path: (projectId) => `/Projects/${projectId}/Tasks`,
  parent: { key: "projectID", label: "Project ID", type: "number" },
  fields: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "status", label: "Status (picklist id)", type: "number", required: true },
    { key: "taskType", label: "Task type (picklist id)", type: "number", required: true },
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

import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Change a task, including moving it to another status or assignee (`PATCH /tasks/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  title?: string;
  description?: string;
  projectId?: number;
  taskListId?: number;
  assigneeId?: number;
  parentTaskId?: number;
  workflowStatusId?: number;
  serviceId?: number;
  dueDate?: string;
  startDate?: string;
  dueTime?: string;
  initialEstimate?: number;
  remainingTime?: number;
  private?: boolean;
  customFields?: unknown;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Change a task, including moving it to another status or assignee (`PATCH /tasks/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { "key": "title", "label": "Title", "type": "string", "hint": "Task title." },
    { "key": "description", "label": "Description", "type": "text" },
    {
      "key": "projectId",
      "label": "Project ID",
      "type": "number",
      "hint": "The project the task belongs to.",
    },
    {
      "key": "taskListId",
      "label": "Task list ID",
      "type": "number",
      "hint": "The task list the task sits on.",
    },
    {
      "key": "assigneeId",
      "label": "Assignee ID",
      "type": "number",
      "hint": "Person id. Only an individual can be assigned, never a team.",
    },
    {
      "key": "parentTaskId",
      "label": "Parent task ID",
      "type": "number",
      "hint": "Makes this a subtask.",
    },
    { "key": "workflowStatusId", "label": "Workflow status ID", "type": "number" },
    { "key": "serviceId", "label": "Service ID", "type": "number" },
    { "key": "dueDate", "label": "Due date", "type": "date" },
    { "key": "startDate", "label": "Start date", "type": "date" },
    {
      "key": "dueTime",
      "label": "Due time",
      "type": "string",
      "hint": "Time of day for the due date, HH:MM.",
    },
    {
      "key": "initialEstimate",
      "label": "Initial estimate (minutes)",
      "type": "number",
      "hint": "Originally forecast time, in minutes.",
    },
    {
      "key": "remainingTime",
      "label": "Remaining time (minutes)",
      "type": "number",
      "hint": "Time still needed, in minutes.",
    },
    {
      "key": "private",
      "label": "Private",
      "type": "boolean",
      "hint": "Hide the task from people without access to private tasks.",
    },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint": "JSON object of custom field values, keyed by custom field id.",
    },
  ],
  output: resourceOutput("Task"),

  async execute(input, ctx) {
    const attrs = {
      "title": input.title,
      "description": input.description,
      "project_id": input.projectId,
      "task_list_id": input.taskListId,
      "assignee_id": input.assigneeId,
      "parent_task_id": input.parentTaskId,
      "workflow_status_id": input.workflowStatusId,
      "service_id": input.serviceId,
      "due_date": input.dueDate,
      "start_date": input.startDate,
      "due_time": input.dueTime,
      "initial_estimate": input.initialEstimate,
      "remaining_time": input.remainingTime,
      "private": input.private,
      "custom_fields": toObject(input.customFields, "custom fields"),
    };
    requireAny(attrs, "task");
    return await new ProductiveClient(ctx).one(`/tasks/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("tasks", attrs),
    });
  },
};

export default taskUpdate;

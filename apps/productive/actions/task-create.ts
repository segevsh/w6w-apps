import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a task (`POST /tasks`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  title: string;
  description?: string;
  projectId: number;
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

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task (`POST /tasks`).",
  idempotent: false,
  params: [
    { "key": "title", "label": "Title", "type": "string", "required": true, "hint": "Task title." },
    { "key": "description", "label": "Description", "type": "text" },
    {
      "key": "projectId",
      "label": "Project ID",
      "type": "number",
      "required": true,
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
    return await new ProductiveClient(ctx).one(`/tasks`, {
      method: "POST",
      body: jsonApiBody("tasks", attrs),
    });
  },
};

export default taskCreate;

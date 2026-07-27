import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  taskId: string;
  content?: string;
  description?: string;
  labels?: string[];
  priority?: number;
  dueString?: string;
  dueDate?: string;
  dueDatetime?: string;
  dueLang?: string;
  assigneeId?: string;
}

/**
 * POST /tasks/{id} — update an active task. Only the fields supplied are
 * changed; the request returns the full updated task.
 */
const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update the fields of an existing active task.",
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "content", label: "Content", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      repeat: true,
      hint: "Replaces the existing labels.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: 1, label: "1 — Normal" },
        { value: 2, label: "2 — High" },
        { value: 3, label: "3 — Very high" },
        { value: 4, label: "4 — Urgent" },
      ],
    },
    { key: "dueString", label: "Due (natural language)", type: "string" },
    { key: "dueDate", label: "Due date", type: "date", hint: "YYYY-MM-DD (all-day)." },
    { key: "dueDatetime", label: "Due datetime", type: "datetime", hint: "RFC 3339 timestamp." },
    { key: "dueLang", label: "Due language", type: "string" },
    { key: "assigneeId", label: "Assignee ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "content", type: "string", label: "Content" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body.content = input.content;
    if (input.description !== undefined) body.description = input.description;
    if (input.labels !== undefined && input.labels.length > 0) body.labels = input.labels;
    if (input.priority !== undefined) body.priority = input.priority;
    if (input.dueString !== undefined) body.due_string = input.dueString;
    if (input.dueDate !== undefined) body.due_date = input.dueDate;
    if (input.dueDatetime !== undefined) body.due_datetime = input.dueDatetime;
    if (input.dueLang !== undefined) body.due_lang = input.dueLang;
    if (input.assigneeId !== undefined) body.assignee_id = input.assigneeId;

    return client.request(`/tasks/${encodeURIComponent(input.taskId)}`, { method: "POST", body });
  },
};

export default taskUpdate;

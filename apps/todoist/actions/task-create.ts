import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  content: string;
  description?: string;
  projectId?: string;
  sectionId?: string;
  parentId?: string;
  order?: number;
  labels?: string[];
  priority?: number;
  dueString?: string;
  dueDate?: string;
  dueDatetime?: string;
  dueLang?: string;
  assigneeId?: string;
}

/**
 * POST /tasks — create a new active task. `content` is the only required field;
 * everything else places the task (project/section/parent) or schedules it. Due
 * dates are mutually exclusive — set at most one of dueString/dueDate/dueDatetime.
 */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new active task in Todoist.",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Content",
      type: "string",
      required: true,
      hint: "Task text. Markdown supported.",
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "projectId", label: "Project ID", type: "string", hint: "Omit to add to the Inbox." },
    { key: "sectionId", label: "Section ID", type: "string" },
    { key: "parentId", label: "Parent task ID", type: "string", hint: "Set to create a sub-task." },
    { key: "order", label: "Order", type: "number" },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      repeat: true,
      hint: "Label names (not ids).",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      hint: "1 (normal) to 4 (urgent).",
      options: [
        { value: 1, label: "1 — Normal" },
        { value: 2, label: "2 — High" },
        { value: 3, label: "3 — Very high" },
        { value: 4, label: "4 — Urgent" },
      ],
    },
    {
      key: "dueString",
      label: "Due (natural language)",
      type: "string",
      hint: 'e.g. "tomorrow at 12pm".',
    },
    { key: "dueDate", label: "Due date", type: "date", hint: "YYYY-MM-DD (all-day)." },
    { key: "dueDatetime", label: "Due datetime", type: "datetime", hint: "RFC 3339 timestamp." },
    {
      key: "dueLang",
      label: "Due language",
      type: "string",
      hint: "2-letter code for parsing `dueString`.",
    },
    {
      key: "assigneeId",
      label: "Assignee ID",
      type: "string",
      hint: "User id, for shared projects.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    const body: Record<string, unknown> = { content: input.content };
    if (input.description !== undefined) body.description = input.description;
    if (input.projectId !== undefined) body.project_id = input.projectId;
    if (input.sectionId !== undefined) body.section_id = input.sectionId;
    if (input.parentId !== undefined) body.parent_id = input.parentId;
    if (input.order !== undefined) body.order = input.order;
    if (input.labels !== undefined && input.labels.length > 0) body.labels = input.labels;
    if (input.priority !== undefined) body.priority = input.priority;
    if (input.dueString !== undefined) body.due_string = input.dueString;
    if (input.dueDate !== undefined) body.due_date = input.dueDate;
    if (input.dueDatetime !== undefined) body.due_datetime = input.dueDatetime;
    if (input.dueLang !== undefined) body.due_lang = input.dueLang;
    if (input.assigneeId !== undefined) body.assignee_id = input.assigneeId;

    return client.request("/tasks", { method: "POST", body });
  },
};

export default taskCreate;

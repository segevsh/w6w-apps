import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM, PARENT_TYPES } from "../lib/client.ts";

interface Input {
  name: string;
  relatedResourceType?: string;
  relatedResourceId?: number;
  assigneeId?: number;
  dueDate?: number;
  reminderDate?: number;
  priority?: string;
  status?: string;
  details?: string;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `POST /tasks` — create a Task.
 *
 * `related_resource` is an object of `{id, type}`, so it is collected here as
 * two params and assembled — a workflow author supplying an id without a type
 * (or the reverse) would otherwise send a half-built object that Copper rejects
 * opaquely. Both must be present for the field to be sent at all.
 *
 * **`completed_date` is deliberately absent.** Copper: "This is automatically set
 * when the status changes from Open to Completed, and cannot be set directly."
 * Offering it would be offering a field that silently does nothing.
 *
 * A note on the date fields: the Task properties table types `due_date` and
 * `reminder_date` as `number`, and the create example sends
 * `"due_date": 1496799000` — a Unix timestamp. Copper's best-practices page,
 * however, lists "Task Due Dates and Reminder dates" among the fields that "use
 * an ISO mm/dd/yyyy format". The two documents disagree. This action follows the
 * endpoint's own worked example and types them as numbers; if your account
 * rejects a timestamp, the string form is the fallback.
 *
 * Not idempotent: a retry creates a second Task.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a Task, optionally attached to a Lead, Person, Company, Opportunity or Project. " +
    "`completed_date` is not settable — Copper fills it when the status flips to Completed.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "relatedResourceType",
      label: "Related resource type",
      type: "select",
      options: PARENT_TYPES.map((t) => ({ value: t, label: t })),
      hint: "Set together with the id below; Copper takes them as one `{id, type}` object.",
    },
    {
      key: "relatedResourceId",
      label: "Related resource ID",
      type: "number",
      hint: "Ignored unless a type is also chosen.",
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    {
      key: "dueDate",
      label: "Due date",
      type: "number",
      hint:
        "Unix timestamp in seconds, matching Copper's own create example. (Its best-practices " +
        "page describes task dates as `MM/DD/YYYY` instead — the two docs disagree; try the " +
        "string form if a timestamp is rejected.)",
    },
    {
      key: "reminderDate",
      label: "Reminder date",
      type: "number",
      hint: "Unix timestamp in seconds. Same caveat as the due date.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "None", label: "None" },
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Open", label: "Open" },
        { value: "Completed", label: "Completed" },
      ],
    },
    { key: "details", label: "Details", type: "text" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const related = input.relatedResourceType && input.relatedResourceId !== undefined
      ? { id: input.relatedResourceId, type: input.relatedResourceType }
      : undefined;

    return new CopperClient(ctx).request("/tasks", {
      method: "POST",
      body: compact({
        name: input.name,
        related_resource: related,
        assignee_id: input.assigneeId,
        due_date: input.dueDate,
        reminder_date: input.reminderDate,
        priority: input.priority,
        status: input.status,
        details: input.details,
        tags: input.tags ?? undefined,
        custom_fields: input.customFields ?? undefined,
      }),
    });
  },
};

export default createTask;

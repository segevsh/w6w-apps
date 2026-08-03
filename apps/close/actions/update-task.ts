import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact } from "../lib/client.ts";

interface Input {
  taskId: string;
  isComplete?: boolean;
  text?: string;
  assignedTo?: string;
  date?: string;
  priority?: string;
}

/**
 * `PUT /task/{id}/` — update a Task.
 *
 * The overwhelmingly common use is `isComplete: true` — marking work done, which
 * moves the task out of the rep's inbox and into the archive. Reassignment
 * (`assigned_to`) and rescheduling (`date`) are the other two.
 *
 * Partial update like every Close PUT, and `date` rather than the deprecated
 * `due_date`, for the same reasons documented on Create Task.
 *
 * One thing worth knowing before relying on completed tasks as a record: Close
 * states that "archived tasks of certain types are automatically deleted after a
 * certain amount of time". Completing a task is not the same as keeping it
 * forever — if the completion needs to be durable, log it as an activity too.
 *
 * Idempotent: marking an already-complete task complete is a no-op.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a Task — most often to mark it complete, reassign it, or move its date.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "task_..." },
    {
      key: "isComplete",
      label: "Is complete",
      type: "boolean",
      hint: "True archives the task out of the rep's inbox. Note Close eventually auto-deletes " +
        "archived tasks of some types.",
    },
    { key: "text", label: "Text", type: "text" },
    {
      key: "assignedTo",
      label: "Assigned to (User ID)",
      type: "string",
      placeholder: "user_...",
      hint: "Reassign the task to another rep.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      placeholder: "2026-01-05",
      hint: "Reschedule. Date or date-time. `due_date` is deprecated — this is the live field.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
      ],
    },
  ],
  output: [{ key: "id", type: "string", label: "Task ID" }],

  execute(input, ctx) {
    return new CloseClient(ctx).request(`/task/${encodeURIComponent(input.taskId)}/`, {
      method: "PUT",
      body: compact({
        is_complete: input.isComplete,
        text: input.text,
        assigned_to: input.assignedTo,
        date: input.date,
        priority: input.priority,
      }),
    });
  },
};

export default updateTask;

import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact } from "../lib/client.ts";
import { assigneeRefs } from "./create-task.ts";

interface Input {
  taskId: string;
  deadlineAt?: string | null;
  isCompleted?: boolean;
  assignees?: string[];
  linkedRecords?: unknown;
}

/**
 * `PATCH /v2/tasks/{task_id}` — update a task.
 *
 * ## The content cannot be changed
 *
 * Stated flatly: "At present, only the `deadline_at`, `is_completed`,
 * `linked_records`, and `assignees` fields can be updated." There is no `content`
 * property in the request schema at all, so a typo in a task's text can only be
 * fixed by deleting and recreating it. That is surprising enough to belong in
 * the action's description rather than in a comment nobody reads.
 *
 * ## Omission and `null` mean different things here
 *
 * Unlike Create Task, where every field is required, this endpoint's four fields
 * are all optional — and `deadline_at` is typed `["string", "null"]`. So:
 *
 *   - leaving the deadline blank **leaves it alone**, and
 *   - sending an explicit `null` **clears it**.
 *
 * `compact()` in `lib/client.ts` preserves exactly that distinction: `undefined`
 * is stripped, a deliberate `null` survives. To clear a deadline, put the
 * literal `null` in the field.
 *
 * `linked_records` and `assignees` are replacements, not merges — the arrays you
 * send become the complete set, so read the task first if you mean to add one
 * assignee rather than to reassign it.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  idempotent: true,
  description:
    "Update a task's deadline, completion, assignees or linked records. **The task's text cannot " +
    "be changed** — Attio publishes no way to edit it. Assignees and linked records are replaced " +
    "wholesale, not merged.",
  params: [
    {
      key: "taskId",
      label: "Task id",
      type: "string",
      required: true,
      placeholder: "649e34f4-c39a-4f4d-99ef-48a36bef8f04",
    },
    {
      key: "isCompleted",
      label: "Completed",
      type: "boolean",
      hint: "Mark the task done or not done. Leave blank to leave it as it is.",
    },
    {
      key: "deadlineAt",
      label: "Deadline",
      type: "string",
      hint: "ISO 8601. **Leaving this blank leaves the existing deadline alone**; to *remove* a " +
        "deadline, pass the literal `null`.",
    },
    {
      key: "assignees",
      label: "Assignees",
      type: "array",
      item: { type: "string", placeholder: "alice@attio.com" },
      hint: "Workspace member emails or UUIDs. **Replaces** the current assignees — an omitted " +
        "member is unassigned. Leave the field untouched to keep them.",
    },
    {
      key: "linkedRecords",
      label: "Linked records",
      type: "json",
      advanced: true,
      hint:
        "Same four shapes as Create Task (bare emails/domains, record ids, or a unique matching " +
        "attribute). **Replaces** the current links.",
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, task_id)" },
    { key: "deadline_at", type: "string", label: "Deadline after the write, or null" },
    { key: "is_completed", type: "boolean", label: "Completion state after the write" },
    { key: "linked_records", type: "array", label: "Records the task is attached to" },
    { key: "assignees", type: "array", label: "Assigned workspace members" },
  ],

  execute(input, ctx) {
    // `compact` keeps a deliberate `null` (clear the deadline) while dropping an
    // untouched field (leave it alone). That distinction is the whole contract
    // of this endpoint.
    const data = compact({
      deadline_at: input.deadlineAt,
      is_completed: input.isCompleted,
      linked_records: input.linkedRecords,
      assignees: input.assignees === undefined ? undefined : assigneeRefs(input.assignees),
    });

    return new AttioClient(ctx).data(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "PATCH",
      body: { data },
    });
  },
};

export default updateTask;

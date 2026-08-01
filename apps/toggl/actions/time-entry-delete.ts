import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  timeEntryId: number;
}

/**
 * DELETE /workspaces/{workspace_id}/time_entries/{time_entry_id} —
 * permanently delete a time entry. Answers with no usable body, so the
 * action reports `{ success: true }`.
 */
const timeEntryDelete: ActionDefinition<Input> = {
  key: "time-entry-delete",
  type: "perform",
  resource: "time-entry",
  title: "Delete Time Entry",
  description: "Permanently delete a time entry.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new TogglClient(ctx);
    await client.request(`/workspaces/${input.workspaceId}/time_entries/${input.timeEntryId}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default timeEntryDelete;

import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  timeEntryId: string;
}

/** DELETE /workspaces/{workspaceId}/time-entries/{timeEntryId}. 204 on success. */
const timeEntryDelete: ActionDefinition<Input> = {
  key: "time-entry-delete",
  type: "perform",
  resource: "time-entry",
  title: "Delete Time Entry",
  description: "Delete a time entry.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    await client.request(`/workspaces/${input.workspaceId}/time-entries/${input.timeEntryId}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default timeEntryDelete;

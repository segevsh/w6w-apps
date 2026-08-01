import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
}

/**
 * DELETE /time_entries/{id} — permanently delete a time entry. Answers with
 * no usable body, so the action reports `{ success: true }`.
 */
const timeEntryDelete: ActionDefinition<Input> = {
  key: "time-entry-delete",
  type: "perform",
  resource: "time-entry",
  title: "Delete Time Entry",
  description: "Permanently delete a time entry.",
  idempotent: true,
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new HarvestClient(ctx);
    await client.request(`/time_entries/${encodeURIComponent(input.timeEntryId)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default timeEntryDelete;

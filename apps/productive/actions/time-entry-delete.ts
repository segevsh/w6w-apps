import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { deleteOutput } from "../lib/params.ts";

/**
 * Delete a time entry (`DELETE /time_entries/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const timeEntryDelete: ActionDefinition<Input> = {
  key: "time-entry-delete",
  type: "perform",
  resource: "time_entry",
  title: "Delete Time Entry",
  description: "Delete a time entry (`DELETE /time_entries/{id}`).",
  idempotent: true,
  params: [{ key: "id", label: "Time entry ID", type: "string", required: true }],
  output: deleteOutput,

  execute(input, ctx) {
    return new ProductiveClient(ctx).remove(`/time_entries/${encodeId(input.id)}`, input.id);
  },
};

export default timeEntryDelete;

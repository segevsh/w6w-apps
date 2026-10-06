import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /time/{timeId}` — Delete a time record; answers with the deleted record.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  timeId: number;
}

const timeDelete: ActionDefinition<Input> = {
  key: "time-delete",
  type: "perform",
  resource: "time-record",
  title: "Delete Time Record",
  description: "Delete a time record; answers with the deleted record.",
  idempotent: true,
  params: [
    {
      key: "timeId",
      label: "Time record ID",
      type: "number",
      required: true,
      hint: "Numeric time record id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Time record ID" },
    { key: "time", type: "number", label: "Seconds" },
    { key: "date", type: "string", label: "Date" },
    { key: "user", type: "number", label: "User ID" },
    { key: "task", type: "object", label: "Task" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/time/${encodeId(input.timeId)}`, { method: "DELETE" });
  },
};

export default timeDelete;

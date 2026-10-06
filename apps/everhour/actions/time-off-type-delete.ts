import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /resource-planner/time-off-types/{typeId}` — Delete a time-off type.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  typeId: number;
}

const timeOffTypeDelete: ActionDefinition<Input> = {
  key: "time-off-type-delete",
  type: "perform",
  resource: "time-off-type",
  title: "Delete Time-Off Type",
  description: "Delete a time-off type.",
  idempotent: true,
  params: [
    {
      key: "typeId",
      label: "Time-off type ID",
      type: "number",
      required: true,
      hint: "Numeric time-off type id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/resource-planner/time-off-types/${encodeId(input.typeId)}`,
      { method: "DELETE" },
    );
  },
};

export default timeOffTypeDelete;

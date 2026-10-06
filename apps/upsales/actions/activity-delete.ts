import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/activities/{id}` — Delete a activity (to-do or phone call). Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const activityDelete: ActionDefinition<Input> = {
  key: "activity-delete",
  type: "perform",
  resource: "activity",
  title: "Delete Activity",
  description: "Delete a activity (to-do or phone call).",
  idempotent: true,
  params: [idParam("id", "Activity ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/activities/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default activityDelete;

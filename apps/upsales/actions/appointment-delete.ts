import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/appointments/{id}` — Delete a appointment. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const appointmentDelete: ActionDefinition<Input> = {
  key: "appointment-delete",
  type: "perform",
  resource: "appointment",
  title: "Delete Appointment",
  description: "Delete a appointment.",
  idempotent: true,
  params: [idParam("id", "Appointment ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/appointments/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default appointmentDelete;

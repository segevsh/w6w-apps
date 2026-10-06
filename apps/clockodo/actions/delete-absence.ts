import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const deleteAbsence: ActionDefinition<Input> = {
  key: "delete-absence",
  type: "perform",
  resource: "absence",
  title: "Delete Absence",
  description: "Delete an absence by id (DELETE /v4/absences/{id}). Irreversible.",
  params: [
    {
      key: "id",
      label: "Absence ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when deleted" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v4/absences/${id}`, { method: "DELETE" });
    return { success: body.success === true };
  },
};

export default deleteAbsence;

import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const deleteEntry: ActionDefinition<Input> = {
  key: "delete-entry",
  type: "perform",
  resource: "entry",
  title: "Delete Time Entry",
  description: "Delete a time entry by id (DELETE /v2/entries/{id}). Irreversible.",
  params: [
    {
      key: "id",
      label: "Entry ID",
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
    const body = await new ClockodoClient(ctx).call(`/v2/entries/${id}`, { method: "DELETE" });
    return { success: body.success === true };
  },
};

export default deleteEntry;

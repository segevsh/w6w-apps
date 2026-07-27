import type { ActionDefinition } from "@w6w/types";
import { PipedriveClient } from "../lib/client.ts";

interface Input {
  personId: number;
}

/** DELETE /persons/{id} — delete a person. Echoes `{ success, data: { id } }`. */
const personDelete: ActionDefinition<Input> = {
  key: "person-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Delete a person by ID.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Deleted person id" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request(`/persons/${encodeURIComponent(String(input.personId))}`, {
      method: "DELETE",
    });
  },
};

export default personDelete;

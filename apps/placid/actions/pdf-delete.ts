import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  id: string | number;
}

/** `DELETE /pdfs/{id}` — 204 on success, 404 if it does not exist. */
const action: ActionDefinition<Input, { id: string; deleted: true }> = {
  key: "pdf-delete",
  type: "perform",
  resource: "pdf",
  title: "Delete PDF",
  description: "Permanently delete a pdf render. A repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "id", label: "PDF ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = required(input.id, "id");
    await new PlacidClient(ctx).json(`/pdfs/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { id, deleted: true };
  },
};

export default action;

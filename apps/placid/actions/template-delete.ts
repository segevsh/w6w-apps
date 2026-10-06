import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  template_uuid: string;
}

/** `DELETE /templates/{template_uuid}` — 200 on success. */
const action: ActionDefinition<Input, { uuid: string; deleted: true }> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Permanently delete a template. A repeat call 404s harmlessly.",
  idempotent: true,
  params: [
    { key: "template_uuid", label: "Template UUID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "UUID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = required(input.template_uuid, "template_uuid");
    await new PlacidClient(ctx).json(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { uuid: id, deleted: true };
  },
};

export default action;

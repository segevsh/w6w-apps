import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  name: string;
}

const deleteTemplate: ActionDefinition<Input> = {
  key: "delete-template",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a template (POST /templates/delete.json).",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/templates/delete.json", { name: input.name });
  },
};

export default deleteTemplate;

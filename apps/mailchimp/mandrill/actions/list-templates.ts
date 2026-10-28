import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  label?: string;
}

const listTemplates: ActionDefinition<Input> = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "Return all templates available to this account (POST /templates/list.json).",
  params: [
    { key: "label", label: "Label", type: "string", hint: "Filter to templates with this label." },
  ],
  output: [{ key: "templates", type: "array", label: "Templates" }],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/templates/list.json", { label: input.label });
  },
};

export default listTemplates;

import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  model?: "contact" | "opportunity" | "all";
}

const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the custom fields defined on the connected location.",
  params: [
    {
      key: "model",
      label: "Object",
      type: "select",
      default: "all",
      options: [
        { value: "contact", label: "Contact" },
        { value: "opportunity", label: "Opportunity" },
        { value: "all", label: "All" },
      ],
    },
  ],
  output: [{ key: "customFields", type: "array", label: "Custom fields" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request(`/locations/${encodeURIComponent(client.locationId)}/customFields`, {
      query: { model: input.model ?? "all" },
    });
  },
};

export default listCustomFields;

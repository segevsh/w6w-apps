import type { ActionDefinition } from "@w6w/types";
import { toMap, WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  fields: Record<string, string> | string;
}

const aiFields: ActionDefinition<Input> = {
  key: "ai-fields",
  type: "read",
  resource: "ai",
  title: "Extract Fields From a Page",
  description:
    "Fetch a page and have an LLM extract named fields from it. A field the page does not " +
    "contain comes back null.",
  params: [
    ...pageParams.slice(0, 1),
    {
      key: "fields",
      label: "Fields to extract",
      type: "json",
      required: true,
      hint: 'A JSON object of field name to description, e.g. {"price": "Current product price"}.',
    },
    ...pageParams.slice(1),
  ],
  output: [
    { key: "result", type: "object", label: "Extracted fields keyed by the requested names" },
  ],

  async execute(input, ctx) {
    const fields = toMap(input.fields, "Fields");
    if (!fields) throw new Error("Fields is required");
    return await new WsaiClient(ctx).json("/ai/fields", { ...pageQuery(input), fields });
  },
};

export default aiFields;

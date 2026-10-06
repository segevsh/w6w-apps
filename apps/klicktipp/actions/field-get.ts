import type { ActionDefinition } from "@w6w/types";
import { kt, seg } from "../lib/client.ts";

interface Input {
  fieldId: string;
  detail?: boolean;
}

/** Return the ID and name (and optionally type) of one data field. */
const fieldGet: ActionDefinition<Input> = {
  key: "field-get",
  type: "read",
  resource: "field",
  title: "Get Data Field",
  description: "Return the ID and name (and optionally type) of one data field.",
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "string",
      required: true,
      hint: "The internal ID, e.g. 12345 for field12345. Get it from List Data Fields.",
    },
    { key: "detail", label: "Include field type", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type (detail mode)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "field-get");
    const f = await kt(ctx, "GET", `/field/${seg(input.fieldId, "fieldId")}`, {
      query: { detail: input.detail ? "true" : undefined },
    }) as { id?: string; name?: string; type?: string };
    return { id: f.id ?? String(input.fieldId), name: f.name ?? "", type: f.type };
  },
};

export default fieldGet;

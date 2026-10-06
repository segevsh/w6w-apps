import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

interface Input {
  detail?: boolean;
}

/** List the key and name (and optionally type) of every contact data field. */
const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "read",
  resource: "field",
  title: "List Data Fields",
  description: "List the key and name (and optionally type) of every contact data field.",
  params: [
    {
      key: "detail",
      label: "Include field type",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "fields", type: "array", label: "Fields: { key, name, type? }" }],

  async execute(input, ctx) {
    ctx.log("info", "field-list");
    const map = await kt(ctx, "GET", "/field", {
      query: { detail: input.detail ? "true" : undefined },
    }) as Record<string, string | { name?: string; type?: string }>;
    const fields = Object.entries(map).map(([key, v]) =>
      typeof v === "string" ? { key, name: v } : { key, name: v.name ?? "", type: v.type }
    );
    return { fields };
  },
};

export default fieldList;

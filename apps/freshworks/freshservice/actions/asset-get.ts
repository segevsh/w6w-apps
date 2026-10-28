import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";

interface Input {
  displayId: number;
  includeTypeFields?: boolean;
}

const assetGet: ActionDefinition<Input> = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description:
    "Fetch one asset. Assets are addressed by their DISPLAY ID, not the `id` field — that is Freshservice's own convention here.",
  params: [
    {
      key: "displayId",
      label: "Display ID",
      type: "number",
      required: true,
      hint: "The `display_id` from a list response, not `id`.",
    },
    {
      key: "includeTypeFields",
      label: "Include type fields",
      type: "boolean",
      hint: "Adds the asset-type-specific attributes. Costs two extra API credits.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Asset ID" },
    { key: "display_id", type: "number", label: "Display ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource("asset", `/assets/${input.displayId}`, {
      query: { include: input.includeTypeFields ? "type_fields" : undefined },
    });
  },
};

export default assetGet;

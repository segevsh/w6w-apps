import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
}

const routeFieldList: ActionDefinition<Input> = {
  key: "route-field-list",
  type: "search",
  resource: "route-field",
  title: "List Route Fields",
  description: "List the merge fields of a route.",
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Fields" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/fields/${encodeURIComponent(String(input.routeId))}`,
      { method: "GET" },
    );
  },
};

export default routeFieldList;

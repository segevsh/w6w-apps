import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
}

const routeRuleList: ActionDefinition<Input> = {
  key: "route-rule-list",
  type: "search",
  resource: "route",
  title: "List Route Rules",
  description: "List the rules of a route.",
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
    { key: "data", type: "array", label: "Rules" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/${encodeURIComponent(String(input.routeId))}/rules`,
      { method: "GET" },
    );
  },
};

export default routeRuleList;

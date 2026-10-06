import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
}

const routeGet: ActionDefinition<Input> = {
  key: "route-get",
  type: "read",
  resource: "route",
  title: "Get Route",
  description: "Fetch one route with its rules.",
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
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/${encodeURIComponent(String(input.routeId))}`,
      { method: "GET" },
    );
  },
};

export default routeGet;

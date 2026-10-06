import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
}

const routeDelete: ActionDefinition<Input> = {
  key: "route-delete",
  type: "perform",
  resource: "route",
  title: "Delete Route",
  description: "Delete a route.",
  idempotent: true,
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
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/routes/${encodeURIComponent(String(input.routeId))}`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default routeDelete;

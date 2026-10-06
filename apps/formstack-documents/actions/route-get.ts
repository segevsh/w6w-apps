import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * Get one data route's details (GET /routes/{id}).
 */
const routeGet: ActionDefinition<Input> = {
  key: "route-get",
  type: "read",
  resource: "route",
  title: "Get Data Route",
  description: "Get one data route's details (GET /routes/{id}).",
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Route ID" },
    { key: "key", type: "string", label: "Merge key" },
    { key: "url", type: "string", label: "Merge URL" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}`);
  },
};

export default routeGet;

import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * List the data routes in the account (GET /routes).
 */
const routeList: ActionDefinition<Input> = {
  key: "route-list",
  type: "read",
  resource: "route",
  title: "List Data Routes",
  description: "List the data routes in the account (GET /routes).",
  params: [],
  output: [
    { key: "routes", type: "array", label: "Array of routes" },
  ],

  execute(_input, ctx) {
    return new WebMergeClient(ctx).request("/routes");
  },
};

export default routeList;

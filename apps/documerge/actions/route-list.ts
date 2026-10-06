import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

type Input = Record<string, never>;

const routeList: ActionDefinition<Input> = {
  key: "route-list",
  type: "search",
  resource: "route",
  title: "List Routes",
  description: "List routes (a route merges several documents into one pack).",
  params: [],
  output: [
    { key: "data", type: "array", label: "Routes" },
  ],

  async execute(_input, ctx) {
    return await new DocuMergeClient(ctx).json(`/api/routes`, { method: "GET" });
  },
};

export default routeList;

import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

const listPipelines: ActionDefinition<Record<string, never>> = {
  key: "list-pipelines",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "List the opportunity pipelines (and their stages) configured on the connected location.",
  params: [],
  output: [{ key: "pipelines", type: "array", label: "Pipelines" }],

  execute(_input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/opportunities/pipelines", {
      query: { locationId: client.locationId },
    });
  },
};

export default listPipelines;

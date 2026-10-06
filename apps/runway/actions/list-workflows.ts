import type { ActionDefinition } from "@w6w/types";
import { RunwayClient } from "../lib/client.ts";

/** `GET /v1/workflows` — published workflows grouped by source workflow; not paginated. */
const listWorkflows: ActionDefinition = {
  key: "list-workflows",
  type: "search",
  resource: "workflow",
  title: "List Workflows",
  description: "List the published Runway workflows, each with its published versions " +
    "(newest first). The version `id` is what Run Workflow takes.",
  params: [],
  output: [{ key: "workflows", type: "array", label: "Workflows with their versions" }],

  async execute(_input, ctx) {
    const { data } = await new RunwayClient(ctx).request("/v1/workflows");
    return { workflows: (data as { data?: unknown[] } | undefined)?.data ?? [] };
  },
};

export default listWorkflows;

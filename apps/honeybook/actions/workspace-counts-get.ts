import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient } from "../lib/client.ts";

type Input = Record<string, never>;

const workspaceCountsGet: ActionDefinition<Input> = {
  key: "workspace-counts-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace Counts",
  description:
    "Workspace counts for the caller's company (all / active / inactive). Company-scoped over the SAME population as listWorkspaces (every workspace the caller's company owns), decomposed along the list's `archived` filter: active = not archived, inactive = archived, all = active + inactive.",
  params: [],
  output: [
    { key: "all", type: "number", label: "All" },
    { key: "active", type: "number", label: "Active" },
    { key: "inactive", type: "number", label: "Inactive" },
  ],

  async execute(_input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/workspaces/counts`);
    return result;
  },
};

export default workspaceCountsGet;

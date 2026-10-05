import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient } from "../lib/client.ts";

type Input = Record<string, never>;

const workspaceExists: ActionDefinition<Input> = {
  key: "workspace-exists",
  type: "read",
  resource: "workspace",
  title: "Check Any Workspace Exists",
  description:
    "Whether the caller's company has any workspace. Company-scoped existence over the SAME population as listWorkspaces: true iff the caller's company owns at least one workspace (equivalently, getWorkspaceCounts.all > 0).",
  params: [],
  output: [
    { key: "has_any", type: "boolean", label: "Has any" },
  ],

  async execute(_input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/workspaces/any`);
    return result;
  },
};

export default workspaceExists;

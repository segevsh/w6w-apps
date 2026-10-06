import type { ActionDefinition } from "@w6w/types";
import { NinoxClient } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}` — the workspace's name and every module (with tables, components). */
interface Output {
  workspace: unknown;
}

const workspaceGet: ActionDefinition<Record<string, never>, Output> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Read the connected workspace: its name and the full definition of every module. " +
    "The result can be large; use List Modules or List Tables when only names are needed.",
  params: [],
  output: [{ key: "workspace", type: "object", label: "Workspace (name and modules)" }],

  async execute(_input, ctx) {
    return { workspace: await new NinoxClient(ctx).data("") };
  },
};

export default workspaceGet;

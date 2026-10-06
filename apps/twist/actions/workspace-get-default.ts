import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/workspaces/get_default`
 *
 * Get the user's default workspace.
 */
type Input = Record<string, never>;

const workspaceGetDefault: ActionDefinition<Input> = {
  key: "workspace-get-default",
  type: "read",
  resource: "workspace",
  title: "Get Default Workspace",
  description: "Get the user's default workspace.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(_input, ctx) {
    return twist(ctx, { method: "GET", path: "/workspaces/get_default" });
  },
};

export default workspaceGetDefault;

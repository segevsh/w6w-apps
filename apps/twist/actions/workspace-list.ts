import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/workspaces/get`
 *
 * List all of the user's workspaces.
 */
type Input = Record<string, never>;

const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List all of the user's workspaces.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(_input, ctx) {
    return twist(ctx, { method: "GET", path: "/workspaces/get" });
  },
};

export default workspaceList;

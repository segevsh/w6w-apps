import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
}

/** GET /workspaces/{workspaceId} — one workspace, with members, invites and folders. */
const workspaceGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Retrieve a single workspace by ID.",
  params: [workspaceIdParam],
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspace", type: "object", label: "The full workspace object" },
  ],

  async execute(input, ctx) {
    const workspace = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    );
    return { id: workspace?.id, name: workspace?.name, workspace };
  },
};

export default workspaceGet;

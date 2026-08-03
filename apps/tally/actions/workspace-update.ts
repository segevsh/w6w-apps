import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  name: string;
}

/**
 * PATCH /workspaces/{workspaceId} — rename a workspace.
 *
 * `name` is the only mutable field the API documents, and it is `required` on
 * the request body even though the verb is PATCH.
 */
const workspaceUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "workspace-update",
  type: "perform",
  resource: "workspace",
  title: "Update Workspace",
  description: "Rename a workspace.",
  // Setting the same name twice converges on the same end state.
  idempotent: true,
  params: [
    workspaceIdParam,
    { key: "name", label: "New name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspace", type: "object", label: "The updated workspace" },
  ],

  async execute(input, ctx) {
    const workspace = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}`,
      { method: "PATCH", body: { name: input.name } },
    );
    return { id: workspace?.id, name: workspace?.name, workspace };
  },
};

export default workspaceUpdate;

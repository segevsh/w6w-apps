import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
}

/** DELETE /workspaces/{workspaceId} — delete a workspace. Responds 204 with no body. */
const workspaceDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "workspace-delete",
  type: "perform",
  resource: "workspace",
  title: "Delete Workspace",
  description: "Delete a workspace and everything filed under it.",
  // Deleting an already-deleted workspace converges on the same end state.
  idempotent: true,
  params: [workspaceIdParam],
  output: [
    { key: "workspaceId", type: "string", label: "Deleted workspace ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Tally workspace", { workspaceId: input.workspaceId });
    await new TallyClient(ctx).request(
      `/workspaces/${encodeURIComponent(input.workspaceId)}`,
      { method: "DELETE" },
    );
    return { workspaceId: input.workspaceId, deleted: true };
  },
};

export default workspaceDelete;

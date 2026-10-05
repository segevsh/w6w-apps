import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
}

const workspaceDelete: ActionDefinition<Input> = {
  key: "workspace-delete",
  type: "perform",
  resource: "workspace",
  title: "Delete Workspace",
  description:
    "Delete a workspace. Archives the workspace and its files/flows to the graveyard and destroys it (and the Project when its last workspace is removed).",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "Whether the call succeeded (the API answers 204 No Content)",
    },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "DELETE",
      `/workspaces/${encodeId(input.workspaceId)}`,
    );
    return result ?? { success: true };
  },
};

export default workspaceDelete;

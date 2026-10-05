import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  userId: string;
}

const workspaceMemberRemove: ActionDefinition<Input> = {
  key: "workspace-member-remove",
  type: "perform",
  resource: "workspace",
  title: "Remove Workspace Member",
  description:
    "Remove a member from a workspace. Only the workspace creator or a super-admin of the creator's company may remove a member; anyone else gets a 404.",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "User id of the member to remove.",
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
      `/workspaces/${encodeId(input.workspaceId)}/members/${encodeId(input.userId)}`,
    );
    return result ?? { success: true };
  },
};

export default workspaceMemberRemove;

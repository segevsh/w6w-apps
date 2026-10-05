import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  tagId: string;
}

const workspaceTagRemove: ActionDefinition<Input> = {
  key: "workspace-tag-remove",
  type: "perform",
  resource: "workspace",
  title: "Remove Workspace Tag",
  description:
    "Untag a workspace (idempotent). Members and super-admins of the creator's company only; anyone else gets a 404.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    { key: "tagId", label: "Tag ID", type: "string", required: true, hint: "Tag id." },
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
      `/workspaces/${encodeId(input.workspaceId)}/tags/${encodeId(input.tagId)}`,
    );
    return result ?? { success: true };
  },
};

export default workspaceTagRemove;

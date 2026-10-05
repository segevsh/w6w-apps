import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  tagId: string;
}

const workspaceTagAdd: ActionDefinition<Input> = {
  key: "workspace-tag-add",
  type: "perform",
  resource: "workspace",
  title: "Add Workspace Tag",
  description:
    "Tag a workspace (idempotent). Members and super-admins of the creator's company only; anyone else gets a 404.",
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
    { key: "id", type: "string", label: "Id" },
    { key: "project_id", type: "string", label: "Project id" },
    { key: "name", type: "string", label: "Name" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "status", type: "string", label: "Status" },
    { key: "source", type: "string", label: "Source" },
    { key: "archived", type: "boolean", label: "Archived" },
    { key: "inactive_user_ids", type: "array", label: "Inactive user ids" },
    { key: "creator_id", type: "string", label: "Creator id" },
    { key: "creator_company_id", type: "string", label: "Creator company id" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/workspaces/${encodeId(input.workspaceId)}/tags/${encodeId(input.tagId)}`,
    );
    return result;
  },
};

export default workspaceTagAdd;

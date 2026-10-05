import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  name?: string;
}

const workspaceUpdate: ActionDefinition<Input> = {
  key: "workspace-update",
  type: "perform",
  resource: "workspace",
  title: "Update Workspace",
  description:
    "Update a workspace (partial; renames the tab). Only the workspace creator, an admin of the creator's company, or a member in that company may update; anyone else gets a 404.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    { key: "name", label: "Name", type: "string", hint: "New workspace (tab) name." },
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
    const body = compact({
      name: input.name,
    });
    const result = await new HoneyBookClient(ctx).request(
      "PATCH",
      `/workspaces/${encodeId(input.workspaceId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default workspaceUpdate;

import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  reason?: string;
}

const workspaceArchive: ActionDefinition<Input> = {
  key: "workspace-archive",
  type: "perform",
  resource: "workspace",
  title: "Archive Workspace",
  description:
    "Archive a workspace for the caller and their team. Only a workspace member, or a super-admin of the creator's company, may archive; anyone else gets a 404.",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    { key: "reason", label: "Reason", type: "string", hint: "Optional reason for archiving." },
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
      reason: input.reason,
    });
    const result = await new HoneyBookClient(ctx).request(
      "POST",
      `/workspaces/${encodeId(input.workspaceId)}/archive`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default workspaceArchive;

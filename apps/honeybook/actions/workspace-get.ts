import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient, toList } from "../lib/client.ts";
import { workspaceIncludeParams } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxScheduledSessions?: number;
}

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description:
    "Get a workspace by id. Only a workspace member, or a moderator-or-greater of the workspace's company, may read it; anyone else gets a 404.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    ...workspaceIncludeParams,
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
      "GET",
      `/workspaces/${encodeId(input.workspaceId)}`,
      {
        query: {
          include: toList(input.include),
          max_action_suggestions: input.maxActionSuggestions,
          max_scheduled_sessions: input.maxScheduledSessions,
        },
      },
    );
    return result;
  },
};

export default workspaceGet;

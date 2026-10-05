import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { workspaceIncludeParams } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxScheduledSessions?: number;
}

const workspaceBook: ActionDefinition<Input> = {
  key: "workspace-book",
  type: "perform",
  resource: "workspace",
  title: "Book Workspace",
  description:
    "Book a workspace (mark the project as booked). Sets status to `client` and advances the pipeline stage to the company's paid stage (else signed, else the first projects-group stage), only when that is forward of the current one.",
  idempotent: true,
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
    const body = compact({
      include: toList(input.include),
      max_action_suggestions: input.maxActionSuggestions,
      max_scheduled_sessions: input.maxScheduledSessions,
    });
    const result = await new HoneyBookClient(ctx).request(
      "POST",
      `/workspaces/${encodeId(input.workspaceId)}/book`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default workspaceBook;

import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty } from "../lib/client.ts";

interface Input {
  projectId: string;
  kind?: string;
}

const projectWorkspaceCreate: ActionDefinition<Input> = {
  key: "project-workspace-create",
  type: "perform",
  resource: "project",
  title: "Create Project Workspace",
  description: "Create a workspace on a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [
        { "value": "general", "label": "General" },
        { "value": "team", "label": "Team" },
        { "value": "design", "label": "Design" },
        { "value": "all_vendors", "label": "All vendors" },
        { "value": "timeline", "label": "Timeline" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "project_id", type: "string", label: "Project id" },
    { key: "name", type: "string", label: "Name" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "member_ids", type: "array", label: "Member ids" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const body = compact({
      kind: input.kind,
    });
    const result = await new HoneyBookClient(ctx).request(
      "POST",
      `/projects/${encodeId(input.projectId)}/workspaces`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default projectWorkspaceCreate;

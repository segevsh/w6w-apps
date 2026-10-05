import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient, toList } from "../lib/client.ts";
import { projectIncludeParams } from "../lib/params.ts";

interface Input {
  projectId: string;
  include?: string[] | string;
  maxWorkspaces?: number;
  maxCustomFields?: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get a project by id.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
    ...projectIncludeParams,
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_date", type: "string", label: "Project date" },
    { key: "project_end_date", type: "string", label: "Project end date" },
    { key: "project_time_start", type: "string", label: "Project time start" },
    { key: "project_time_end", type: "string", label: "Project time end" },
    { key: "project_timezone", type: "string", label: "Project timezone" },
    { key: "project_timezone_iana", type: "string", label: "Project timezone iana" },
    { key: "project_location", type: "string", label: "Project location" },
    { key: "project_details", type: "string", label: "Project details" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/projects/${encodeId(input.projectId)}`,
      {
        query: {
          include: toList(input.include),
          max_workspaces: input.maxWorkspaces,
          max_custom_fields: input.maxCustomFields,
        },
      },
    );
    return result;
  },
};

export default projectGet;

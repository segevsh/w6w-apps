import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  branchData?: boolean;
}

/**
 * GET /v1/projects/{project_id}/files — list the files within a project.
 * Requires `projects:read`.
 */
const getProjectFiles: ActionDefinition<Input> = {
  key: "get-project-files",
  type: "read",
  resource: "project",
  title: "Get Project Files",
  description: "List the files in a Figma project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "From `get-team-projects`, or the project page URL.",
    },
    {
      key: "branchData",
      label: "Include branch metadata",
      type: "boolean",
      default: false,
      hint: "Include branch metadata for each main file that has one.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Project name" },
    { key: "files", type: "array", label: "Files" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/projects/${encodeURIComponent(input.projectId)}/files`, {
      query: { branch_data: input.branchData },
    });
  },
};

export default getProjectFiles;

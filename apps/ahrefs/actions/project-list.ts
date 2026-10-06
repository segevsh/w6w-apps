import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  projectId?: number;
  access?: string;
}

/** `GET /management/projects` — response key `projects`. */
const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List Ahrefs projects (Rank Tracker and Site Audit) the key can see. Free.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      hint: "The numeric project id (from the project's URL or List Projects).",
      validation: { min: 1, integer: true },
    },
    {
      key: "access",
      label: "Access",
      type: "select",
      hint: "Only projects with this access type.",
      options: [{ value: "private", label: "Private" }, { value: "shared", label: "Shared" }],
    },
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/management/projects", {
      project_id: input.projectId,
      access: input.access,
    });
  },
};

export default projectList;

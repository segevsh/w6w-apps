import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  projectId: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch a single project by ID.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).get(`/2.0/pr_project/${encodeURIComponent(input.projectId)}`);
  },
};

export default projectGet;

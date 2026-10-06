import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** Fetch one project: name, description, sub-domain and status (0 active, 1 inactive). */
interface Input {
  projectId?: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description:
    "Fetch one project: name, description, sub-domain and status (0 active, 1 inactive).",
  params: [projectIdParam],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sub_domain_name", type: "string", label: "Sub-domain" },
    { key: "status", type: "number", label: "0 active, 1 inactive" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("GET", c.projectPath(input.projectId));
  },
};

export default projectGet;

import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

/** GET /projects — list all projects for the authenticated user. */
const projectGetMany: ActionDefinition<Record<string, never>> = {
  key: "project-get-many",
  type: "read",
  resource: "project",
  title: "Get Many Projects",
  description: "List all active projects.",
  params: [],
  output: [
    { key: "results", type: "array", label: "Projects" },
  ],

  execute(_input, ctx) {
    const client = new TodoistClient(ctx);
    return client.request("/projects");
  },
};

export default projectGetMany;

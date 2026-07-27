import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  projectId?: string;
}

/**
 * GET /sections — list sections. Pass `projectId` to scope to one project;
 * omit it to list every section across all projects.
 */
const sectionGetMany: ActionDefinition<Input> = {
  key: "section-get-many",
  type: "read",
  resource: "section",
  title: "Get Many Sections",
  description: "List sections, optionally scoped to a single project.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", hint: "Omit to list all sections." },
  ],
  output: [
    { key: "results", type: "array", label: "Sections" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    return client.request("/sections", { query: { project_id: input.projectId } });
  },
};

export default sectionGetMany;

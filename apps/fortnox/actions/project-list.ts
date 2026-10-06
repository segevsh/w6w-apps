import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  description?: string;
  projectLeader?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "projectLeader",
      "label": "Project leader",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "Projects",
      "type": "array",
      "label": "Projects",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/projects", {
      page: input.page,
      limit: input.limit,
      description: input.description,
      projectleader: input.projectLeader,
    });
  },
};

export default projectList;

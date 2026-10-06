import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

interface Input {
  q?: string;
}

/** `GET /api/v1/users/current/projects` */
const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "The user's WakaTime projects, optionally filtered by a search term.",
  params: [
    { key: "q", label: "Search", type: "string", hint: "Filter project names." },
  ],
  output: [
    { key: "data", type: "array", label: "Projects (id, name, repository, badge, ...)" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/projects`, {
      query: {
        q: input.q,
      },
    });
  },
};

export default projectList;

import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";

/**
 * `GET /api/v3/projects` — every Project. Answers a bare JSON array with no
 * pagination parameters at all; this endpoint has no way to limit the response.
 */
const projectList: ActionDefinition<Record<string, never>> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List every Project in the connected workspace.",
  params: [],
  output: [{ key: "data", type: "array", label: "Projects" }],

  execute(_input, ctx) {
    return new ShortcutClient(ctx).get("/projects");
  },
};

export default projectList;

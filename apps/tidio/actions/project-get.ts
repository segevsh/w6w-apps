import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/** `GET /project`. */
const projectGet: ActionDefinition<Record<string, never>> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Return the authenticated Tidio project's ID and online/offline status.",
  params: [],
  output: [
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "status", type: "string", label: "online or offline" },
  ],
  execute(_input, ctx) {
    return call(ctx, "GET", "/project");
  },
};

export default projectGet;

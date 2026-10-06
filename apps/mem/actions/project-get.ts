import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/** `GET /v2/projects/{project_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project.",
  params: [
    str("project_id", "Project ID", { required: true }),
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "status", type: "string", label: "active, resolved or archived" },
    { key: "last_activity_at", type: "string", label: "Last activity" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/projects/${encodeId(input.project_id)}`);
  },
};

export default projectGet;

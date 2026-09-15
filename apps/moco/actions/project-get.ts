import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  projectId: number;
}

/** `GET /projects/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. */
const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch a single project by ID, including nested tasks and contracts.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/projects/${input.projectId}`);
  },
};

export default projectGet;

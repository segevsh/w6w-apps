import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  projectId: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project by id.",
  params: [
    idParam("projectId", "Project ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The project" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/projects/${encodeId(input.projectId)}`);
  },
};

export default projectGet;

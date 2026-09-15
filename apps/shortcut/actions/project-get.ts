import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

interface Input {
  projectId: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one Project's full definition.",
  params: [projectIdParam],
  output: [{ key: "data", type: "object", label: "The Project" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/projects/${input.projectId}`);
  },
};

export default projectGet;

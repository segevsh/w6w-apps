import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
}

const projectTrash: ActionDefinition<Input> = {
  key: "project-trash",
  type: "perform",
  resource: "project",
  title: "Trash Project",
  description: "Move a project to the portal bin (restorable with Restore Project).",
  idempotent: true,
  params: [
    portalId,
    projectId,
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/trash`,
    );
    return { item: body };
  },
};

export default projectTrash;

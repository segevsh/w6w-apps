import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
}

const projectRestore: ActionDefinition<Input> = {
  key: "project-restore",
  type: "perform",
  resource: "project",
  title: "Restore Project",
  description: "Restore a project from the portal bin.",
  idempotent: true,
  params: [
    portalId,
    projectId,
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/restore`,
    );
    return { item: body };
  },
};

export default projectRestore;

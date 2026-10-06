import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one project by id (`GET /projects/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get one project by id (`GET /projects/{id}`).",
  params: [
    { key: "id", label: "Project ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Project"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/projects/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default projectGet;

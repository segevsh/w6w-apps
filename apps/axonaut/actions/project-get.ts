import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/projects/{projectId}` — Get one project by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  projectId: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get one project by id.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the project.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "number", type: "string", label: "Number" },
    { key: "company_id", type: "number", label: "Company ID" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/projects/${encodeId(input.projectId)}`);
  },
};

export default projectGet;

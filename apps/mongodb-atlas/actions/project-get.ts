import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}` — one project.
 *
 * `clusterCount` is the field worth reading: it is what the project is
 * costing, in the crudest possible terms, and it is what makes a "delete this
 * project" decision reversible or not.
 *
 * A malformed id returns **401**, not 400 — Atlas validates ids after
 * authorisation — so the client checks the 24-hex shape before sending, and a
 * typo does not read as an expired token.
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description:
    "One project's details, including how many clusters it holds. A malformed id would answer " +
    "401 rather than 400, so the shape is checked here first.",
  params: [PROJECT_PARAM],
  output: [
    { key: "project", type: "object", label: "The project" },
    { key: "id", type: "string", label: "Its id" },
    { key: "name", type: "string", label: "Its name" },
    { key: "orgId", type: "string", label: "The organisation that owns it" },
    { key: "clusterCount", type: "number", label: "Clusters in it" },
    { key: "created", type: "string", label: "When it was created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const project = await new AtlasClient(ctx).request<{
      id?: string;
      name?: string;
      orgId?: string;
      clusterCount?: number;
      created?: string;
    }>(`/api/atlas/v2/groups/${id}`);

    return {
      project,
      id: project?.id,
      name: project?.name,
      orgId: project?.orgId,
      clusterCount: project?.clusterCount,
      created: project?.created,
    };
  },
};

export default action;

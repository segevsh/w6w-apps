import type { ActionDefinition } from "@w6w/types";
import { parentOf, resolveLocation, resolveProject, VertexClient } from "../lib/client.ts";
import { LIST_PARAMS, LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/{parent}/models` — verified against the discovery document
 * (`projects.locations.models.list`): query `filter`, `pageSize`, `pageToken`, and a
 * response carrying `models` plus `nextPageToken`.
 */
const action: ActionDefinition = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List models",
  description: "List the models in a project's Model Registry in one location.",
  params: [PROJECT_PARAM, LOCATION_PARAM, ...LIST_PARAMS],
  output: [
    { key: "items", type: "array", label: "Models" },
    { key: "nextPageToken", type: "string", label: "Set when more results remain after the limit" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const location = resolveLocation(ctx.connection, p.location);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vertex AI models", { project, location, returnAll, limit });

    return await new VertexClient(ctx).requestAll(
      location,
      `${parentOf(project, location)}/models`,
      "models",
      { query: { filter: (p.filter as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectKey}` — verified against LaunchDarkly's OpenAPI
 * document (`getProject`).
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description: "Retrieve one project and its environments.",
  params: [PROJECT_PARAM],
  output: [
    { key: "key", type: "string", label: "Project key" },
    { key: "name", type: "string", label: "Name" },
    { key: "environments", type: "object", label: "The project's environments" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "defaultClientSideAvailability", type: "object", label: "Client-side SDK defaults" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);

    ctx.log("info", "getting a LaunchDarkly project", { project });

    return await new LaunchDarklyClient(ctx).request(`/projects/${encodeURIComponent(project)}`);
  },
};

export default action;

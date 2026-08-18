import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectKey}/environments` — verified against LaunchDarkly's
 * OpenAPI document (`getEnvironmentsByProject`).
 *
 * The environment keys the flag and segment actions take. Worth checking rather
 * than assuming: `production` is a convention, not a guarantee, and a project
 * may call it `prod` or `live` — and naming the wrong one does not fail, it
 * acts on the wrong environment.
 */
const action: ActionDefinition = {
  key: "environment-list",
  type: "read",
  resource: "environment",
  title: "List environments",
  description: "List a project's environments — the keys flag toggles act on.",
  params: [PROJECT_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly environments", { project, returnAll });

    return await new LaunchDarklyClient(ctx).requestAll(
      `/projects/${encodeURIComponent(project)}/environments`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /segments/{projectKey}/{environmentKey}` — verified against
 * LaunchDarkly's OpenAPI document (`getSegments`).
 *
 * **Segments are per environment, unlike flags.** A flag exists once and is
 * configured in each environment; a segment with the same key in `staging` and
 * `production` is two independent lists that can hold different people. That is
 * why the environment is in the path here rather than a filter.
 */
const action: ActionDefinition = {
  key: "segment-list",
  type: "read",
  resource: "segment",
  title: "List segments",
  description: "List an environment's segments — reusable audiences flags can target.",
  params: [PROJECT_PARAM, ENVIRONMENT_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly segments", { project, environment, returnAll });

    return await new LaunchDarklyClient(ctx).requestAll(
      `/segments/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

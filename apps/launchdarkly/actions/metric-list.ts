import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /metrics/{projectKey}` — verified against LaunchDarkly's OpenAPI
 * document (`getMetrics`).
 *
 * The metrics experiments and guarded rollouts measure against. Reading them is
 * in scope; running an experiment is not — that is a whole surface of its own,
 * and starting or stopping one from an unattended workflow is a decision with
 * statistical consequences rather than an operational switch.
 */
const action: ActionDefinition = {
  key: "metric-list",
  type: "read",
  resource: "metric",
  title: "List metrics",
  description: "A project's metrics — what experiments and guarded rollouts measure.",
  params: [PROJECT_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly metrics", { project, returnAll });

    return await new LaunchDarklyClient(ctx).requestAll(
      `/metrics/${encodeURIComponent(project)}`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

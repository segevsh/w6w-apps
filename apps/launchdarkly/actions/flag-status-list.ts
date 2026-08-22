import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /flag-statuses/{projectKey}/{environmentKey}` — verified against
 * LaunchDarkly's OpenAPI document (`getFeatureFlagStatuses`).
 *
 * Every flag's evaluation status in one environment, which is what a periodic
 * "what can we delete" workflow reads. See `flag-status-get` for what the four
 * states mean; `launched` and `inactive` are the ones worth acting on.
 *
 * Note this endpoint answers `{items: […]}` without paging parameters — it is
 * the whole set for the environment.
 */
const action: ActionDefinition = {
  key: "flag-status-list",
  type: "read",
  resource: "flag-status",
  title: "List flag evaluation statuses",
  description: "Every flag's evaluation status in one environment — the flag-cleanup report.",
  params: [PROJECT_PARAM, ENVIRONMENT_PARAM],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);

    ctx.log("info", "listing LaunchDarkly flag statuses", { project, environment });

    // Unpaged: the response is the whole set for the environment.
    const body = await new LaunchDarklyClient(ctx).request<{ items?: unknown[] }>(
      `/flag-statuses/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
    );
    return body?.items ?? [];
  },
};

export default action;

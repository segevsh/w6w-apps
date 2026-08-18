import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /flag-statuses/{projectKey}/{environmentKey}/{featureFlagKey}` —
 * verified against LaunchDarkly's OpenAPI document
 * (`getFeatureFlagStatus`).
 *
 * **This answers "is anything still using this flag", which is the question a
 * cleanup workflow needs and the flag object cannot answer.** The states are:
 *
 *   - `new` — created, never evaluated.
 *   - `active` — being evaluated by real code.
 *   - `inactive` — not evaluated for a while; a candidate for removal.
 *   - `launched` — every user has been getting the same variation for long
 *     enough that the flag is doing nothing.
 *
 * `launched` and `inactive` are the interesting ones: both mean the flag is
 * dead weight, and neither is visible from the flag's own configuration, which
 * looks identical either way.
 */
const action: ActionDefinition = {
  key: "flag-status-get",
  type: "read",
  resource: "flag-status",
  title: "Get a flag's evaluation status",
  description: "Whether a flag is still being evaluated — the question before removing one.",
  params: [
    PROJECT_PARAM,
    ENVIRONMENT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "name", type: "string", label: "new, active, inactive or launched" },
    { key: "lastRequested", type: "string", label: "When an SDK last evaluated it" },
    { key: "default", type: "object", label: "The variation served by default" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");

    ctx.log("info", "getting a LaunchDarkly flag status", { project, environment, flagKey });

    return await new LaunchDarklyClient(ctx).request(
      `/flag-statuses/${encodeURIComponent(project)}/${encodeURIComponent(environment)}/${
        encodeURIComponent(flagKey)
      }`,
    );
  },
};

export default action;

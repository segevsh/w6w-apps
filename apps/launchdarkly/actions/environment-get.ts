import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectKey}/environments/{environmentKey}` — verified against
 * LaunchDarkly's OpenAPI document (`getEnvironment`).
 *
 * **This response contains SDK keys.** `apiKey`, `mobileKey` and
 * `_id`-adjacent fields are credentials that let a client evaluate flags, and
 * they are returned in full. Nothing here logs them, and a workflow that stores
 * this response is storing secrets — which is worth knowing before piping it
 * into a document store.
 *
 * `confirmChanges` and `requireComments` are the environment's guard rails: an
 * environment with `confirmChanges` on expects a human to confirm flag changes
 * in the UI, and API changes bypass that.
 */
const action: ActionDefinition = {
  key: "environment-get",
  type: "read",
  resource: "environment",
  title: "Get an environment",
  description:
    "One environment and its settings. The response includes SDK keys, which are secrets.",
  params: [PROJECT_PARAM, ENVIRONMENT_PARAM],
  output: [
    { key: "key", type: "string", label: "Environment key" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Colour" },
    {
      key: "confirmChanges",
      type: "boolean",
      label: "UI asks for confirmation — the API does not",
    },
    { key: "requireComments", type: "boolean", label: "Changes require a comment" },
    { key: "critical", type: "boolean", label: "Marked critical" },
    { key: "apiKey", type: "string", label: "SDK key — returned in full, and is a secret" },
    { key: "mobileKey", type: "string", label: "Mobile SDK key — also a secret" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);

    // The response carries SDK keys; only the identifiers are logged.
    ctx.log("info", "getting a LaunchDarkly environment", { project, environment });

    return await new LaunchDarklyClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/environments/${encodeURIComponent(environment)}`,
    );
  },
};

export default action;

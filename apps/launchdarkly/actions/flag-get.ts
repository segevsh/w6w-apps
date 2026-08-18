import type { ActionDefinition } from "@w6w/types";
import { csv, LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /flags/{projectKey}/{featureFlagKey}` — verified against LaunchDarkly's
 * OpenAPI document (`getFeatureFlag`).
 *
 * **`environments` is keyed by environment, and every one is present.** A flag
 * is on in one and off in another; there is no single "is this flag on"
 * answer, which is the thing most likely to surprise a workflow reading it.
 *
 * Within an environment, `on` is only half the story: `fallthrough` says what
 * an unmatched user gets, `offVariation` says what everyone gets when it is
 * off, and `rules` may serve something else entirely. A flag that is "on" while
 * its fallthrough serves the old variation changes nothing for anyone.
 */
const action: ActionDefinition = {
  key: "flag-get",
  type: "read",
  resource: "flag",
  title: "Get a flag",
  description: "Retrieve one flag, with its state and targeting in each environment.",
  params: [
    PROJECT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
    {
      key: "env",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank returns the configuration for every environment.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Name" },
    { key: "kind", type: "string", label: "boolean or multivariate" },
    { key: "variations", type: "array", label: "The values it can serve" },
    {
      key: "environments",
      type: "object",
      label: "Per environment — `on` alone does not say what users get",
    },
    { key: "archived", type: "boolean", label: "Archived" },
    { key: "temporary", type: "boolean", label: "Temporary — meant to be removed" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "maintainer", type: "object", label: "Maintainer" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");

    ctx.log("info", "getting a LaunchDarkly flag", { project, flagKey });

    return await new LaunchDarklyClient(ctx).request(
      `/flags/${encodeURIComponent(project)}/${encodeURIComponent(flagKey)}`,
      { query: { env: csv(p.env) } },
    );
  },
};

export default action;

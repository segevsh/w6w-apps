import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveEnvironment, resolveProject } from "../lib/client.ts";
import { ENVIRONMENT_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /flags/{projectKey}/{featureFlagKey}` with a **semantic patch** —
 * verified against LaunchDarkly's OpenAPI document
 * (`patchFeatureFlag`; instructions `turnFlagOn` and `turnFlagOff`).
 *
 * **This is the action with real-world consequences**, so three things about it
 * are worth stating plainly.
 *
 * *It takes effect in seconds, everywhere.* Turning a flag on is not a
 * configuration change waiting for a deploy — connected SDKs are streaming, and
 * the new value reaches production users almost immediately.
 *
 * *A flag exists in every environment of its project.* Naming the wrong
 * environment does not fail; it turns the flag on somewhere else, successfully.
 * That is why the environment is a first-class parameter with its own hint
 * rather than something folded into the project.
 *
 * *Turning a flag on does not mean everyone gets the new behaviour.* "On" means
 * the flag's targeting rules apply; if the default rule serves 0%, on and off
 * look identical to users. `flag-get` shows the rules.
 */
const action: ActionDefinition = {
  key: "flag-toggle",
  type: "perform",
  resource: "flag",
  title: "Turn a flag on or off",
  description: "Switch a feature flag in one environment. Takes effect in seconds.",
  // Turning an already-on flag on is a no-op, not a second change.
  idempotent: true,
  params: [
    PROJECT_PARAM,
    ENVIRONMENT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
    {
      key: "on",
      label: "State",
      type: "select",
      required: true,
      default: "off",
      options: [
        { value: "off", label: "Off — the flag serves its off variation" },
        { value: "on", label: "On — the flag's targeting rules apply" },
      ],
      hint: "On means the targeting rules apply, not that everyone gets the new behaviour.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      default: "",
      hint: "Recorded in the audit log, which is how anyone later finds out why.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Name" },
    { key: "environments", type: "object", label: "Per-environment state after the change" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const environment = resolveEnvironment(ctx.connection, p.environmentKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");
    const on = String(p.on ?? "off") === "on";

    // Worth a warn: this reaches production users within seconds.
    ctx.log("warn", "toggling a LaunchDarkly flag", { project, environment, flagKey, on });

    return await new LaunchDarklyClient(ctx).semanticPatch(
      `/flags/${encodeURIComponent(project)}/${encodeURIComponent(flagKey)}`,
      [{ kind: on ? "turnFlagOn" : "turnFlagOff" }],
      {
        environmentKey: environment,
        ...(String(p.comment ?? "").trim() ? { comment: String(p.comment).trim() } : {}),
      },
    );
  },
};

export default action;

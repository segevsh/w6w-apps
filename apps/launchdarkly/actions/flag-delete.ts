import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /flags/{projectKey}/{featureFlagKey}` — verified against
 * LaunchDarkly's OpenAPI document (`deleteFeatureFlag`).
 *
 * **This is not the cleanup verb; archiving is.** Deleting a flag removes its
 * targeting, its history and its audit trail across every environment, and any
 * code still evaluating it silently falls back to the SDK's default — which may
 * be neither of the values it was serving. Archiving (`flag-archive`) has the
 * same effect on evaluation while staying reversible and keeping the record.
 *
 * So this requires an explicit confirmation and says which action to reach for
 * instead.
 */
const action: ActionDefinition = {
  key: "flag-delete",
  type: "perform",
  resource: "flag",
  title: "Delete a flag",
  description: "Permanently delete a flag and its history. Archiving is the reversible option.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand the targeting and history go with it",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Consider Archive instead — same effect on evaluation, and reversible.",
    },
  ],
  output: [
    { key: "flagKey", type: "string", label: "Flag key" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");
    if (p.confirm !== true) {
      throw new Error(
        "`confirm` must be true — deleting a flag takes its history, and archiving is reversible",
      );
    }

    ctx.log("warn", "deleting a LaunchDarkly flag", { project, flagKey });

    await new LaunchDarklyClient(ctx).request(
      `/flags/${encodeURIComponent(project)}/${encodeURIComponent(flagKey)}`,
      { method: "DELETE" },
    );
    return { flagKey, deleted: true };
  },
};

export default action;

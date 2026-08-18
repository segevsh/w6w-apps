import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /flags/{projectKey}/{featureFlagKey}` with the `archiveFlag` or
 * `restoreFlag` instruction — verified against LaunchDarkly's OpenAPI document.
 *
 * **Archiving is the reversible half of removing a flag**, and it is what a
 * cleanup workflow should reach for rather than delete. An archived flag stops
 * appearing in the default listing and stops being evaluated — **so any code
 * still calling it gets the SDK's fallback value**, which is the argument for
 * archiving before deleting: if something breaks, `restore` puts it back, and
 * the flag's history is still there.
 */
const action: ActionDefinition = {
  key: "flag-archive",
  type: "perform",
  resource: "flag",
  title: "Archive or restore a flag",
  description: "Archive a flag (reversible) or bring one back. Archived flags stop evaluating.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "flagKey", label: "Flag Key", type: "string", required: true, default: "" },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "archive",
      options: [
        { value: "archive", label: "Archive — code still calling it gets the SDK fallback" },
        { value: "restore", label: "Restore" },
      ],
    },
    { key: "comment", label: "Comment", type: "string", default: "" },
  ],
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectKey);
    const flagKey = String(p.flagKey ?? "").trim();
    if (!flagKey) throw new Error("`flagKey` is required");
    const which = String(p.action ?? "archive");
    if (which !== "archive" && which !== "restore") {
      throw new Error("`action` must be `archive` or `restore`");
    }
    const comment = String(p.comment ?? "").trim();

    ctx.log("warn", "archiving or restoring a LaunchDarkly flag", { project, flagKey, which });

    return await new LaunchDarklyClient(ctx).semanticPatch(
      `/flags/${encodeURIComponent(project)}/${encodeURIComponent(flagKey)}`,
      [{ kind: which === "archive" ? "archiveFlag" : "restoreFlag" }],
      comment ? { comment } : {},
    );
  },
};

export default action;

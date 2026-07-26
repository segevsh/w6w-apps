import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  workflowId: string;
  enabled: boolean;
}

/**
 * Enable and disable are separate GitHub endpoints (`/enable`, `/disable`).
 * They are folded into one action with a boolean, because as two actions they
 * would differ only in the last path segment.
 */
const workflowEnable: ActionDefinition<Input> = {
  key: "workflow-enable",
  type: "perform",
  resource: "workflow",
  title: "Enable or Disable Workflow",
  description: "Turn an Actions workflow on or off.",
  // Writes an absolute state.
  idempotent: true,
  params: [
    owner,
    repository,
    {
      key: "workflowId",
      label: "Workflow",
      type: "string",
      required: true,
      hint: "Id or file name.",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      required: true,
      default: true,
      hint: "On enables the workflow; off disables it manually.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    const verb = input.enabled ? "enable" : "disable";
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/actions/workflows/${
        encodeURIComponent(input.workflowId)
      }/${verb}`,
      { method: "PUT" },
    );
  },
};

export default workflowEnable;

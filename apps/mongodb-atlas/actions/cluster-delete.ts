import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { CLUSTER_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /api/atlas/v2/groups/{groupId}/clusters/{clusterName}` — destroy a
 * cluster and everything in it.
 *
 * ## The data goes, and the backups may go with it
 *
 * This is not a decommissioning workflow with a grace period. The cluster and
 * its data are removed. Continuous-backup snapshots are retained only if
 * `retainBackups` was set on the delete; otherwise they go too, and there is
 * then no copy of the data anywhere.
 *
 * ## Termination protection is the real safety, and this respects it
 *
 * When `terminationProtectionEnabled` is on, Atlas refuses the delete outright.
 * That is the mechanism worth relying on, and this action reads it first so
 * the refusal explains itself rather than arriving as a 400 from the far end.
 *
 * The confirmation asked for here is the cluster **name**, typed again, because
 * the wrong value destroys a different production database and the failure
 * surfaces later, to somebody else.
 *
 * ## Deleting is asynchronous
 *
 * The call returns and the cluster enters `DELETING`. It is gone from
 * `cluster-list` before it is actually gone, and billing stops when it
 * finishes rather than when the call returns.
 */
const action: ActionDefinition = {
  key: "cluster-delete",
  type: "perform",
  resource: "cluster",
  title: "Delete a cluster",
  description:
    "Destroy a cluster and its data. Atlas REFUSES this while termination protection is on. " +
    "Backups go too unless retained, leaving no copy of the data anywhere.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    CLUSTER_PARAM,
    {
      key: "confirmName",
      label: "Type the cluster name again",
      type: "string",
      required: true,
      default: "",
      hint: "Must match exactly. The data goes with it.",
    },
    {
      key: "retainBackups",
      label: "Keep the backup snapshots",
      type: "boolean",
      default: true,
      hint: "ON by default here. Off, the snapshots are deleted as well and there is no copy of " +
        "the data left anywhere.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete was accepted" },
    { key: "name", type: "string", label: "What was deleted" },
    { key: "retainedBackups", type: "boolean", label: "Whether snapshots were kept" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const name = String(p.cluster ?? "").trim();
    if (!name) throw new Error("`cluster` is required");

    const confirm = String(p.confirmName ?? "").trim();
    if (confirm !== name) {
      throw new Error(
        `\`confirmName\` must match the cluster name exactly — got "${confirm}" for "${name}". ` +
          "This destroys the cluster and its data",
      );
    }

    const client = new AtlasClient(ctx);
    const path = `/api/atlas/v2/groups/${id}/clusters/${encodeURIComponent(name)}`;

    const before = await client.request<{ terminationProtectionEnabled?: boolean }>(path, {
      version: "2024-08-05",
    });
    if (before?.terminationProtectionEnabled === true) {
      throw new Error(
        `"${name}" has termination protection on, and Atlas will refuse to delete it. Turning ` +
          "that off is a separate, deliberate act — `cluster-update` does it, and asks",
      );
    }

    const retainBackups = p.retainBackups !== false;
    await client.request(path, {
      method: "DELETE",
      version: "2023-02-01",
      query: { retainBackups },
    });

    ctx.log("warn", "deleted an Atlas cluster — the data is gone", { name, retainBackups });

    return { deleted: true, name, retainedBackups: retainBackups };
  },
};

export default action;

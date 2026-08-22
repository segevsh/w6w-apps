import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `DELETE /orgs/{org_id}/targets/{target_id}` — verified against Snyk's own
 * API document (`deleteOrgsTarget`).
 *
 * Deleting a target removes **every project under it**, which is the usual way
 * to detach a repository that has been archived.
 */
const action: ActionDefinition = {
  key: "target-delete",
  type: "perform",
  resource: "target",
  title: "Delete a target",
  description: "Remove a target and all of its projects from Snyk.",
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "targetId", label: "Target ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Target ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const targetId = String(p.targetId ?? "").trim();
    if (!targetId) throw new Error("`targetId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "deleting Snyk target", { org, targetId });

    await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/targets/${encodeURIComponent(targetId)}`,
      { method: "DELETE" },
    );
    return { id: targetId, deleted: true };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/targets/{target_id}` — verified against Snyk's own API
 * document (`getOrgsTarget`).
 */
const action: ActionDefinition = {
  key: "target-get",
  type: "read",
  resource: "target",
  title: "Get a target",
  description: "Retrieve one target and where it was imported from.",
  params: [
    ORG_PARAM,
    { key: "targetId", label: "Target ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "data", type: "object", label: "Target" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const targetId = String(p.targetId ?? "").trim();
    if (!targetId) throw new Error("`targetId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "getting Snyk target", { org, targetId });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/targets/${encodeURIComponent(targetId)}`,
    );
  },
};

export default action;

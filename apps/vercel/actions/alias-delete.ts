import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v2/aliases/{aliasId}` — verified against Vercel's OpenAPI document
 * (`deleteAlias`). It answers `{ status: "SUCCESS" }`.
 */
const action: ActionDefinition = {
  key: "alias-delete",
  type: "perform",
  resource: "alias",
  title: "Delete an alias",
  description: "Remove an alias, so the domain no longer points at a deployment.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    {
      key: "aliasId",
      label: "Alias or Alias ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const aliasId = String(p.aliasId ?? "").trim();
    if (!aliasId) throw new Error("`aliasId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "deleting Vercel alias", { aliasId });

    return await client.request(`/v2/aliases/${encodeURIComponent(aliasId)}`, {
      method: "DELETE",
    });
  },
};

export default action;

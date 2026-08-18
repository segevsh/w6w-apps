import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";
import { CONTRACT_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /contracts/{contract_id}/milestones` — verified against Deel's own
 * OpenAPI document (`ic-endpoints.json`, `get-contract-milestones`).
 */
const action: ActionDefinition = {
  key: "contract-milestone-list",
  type: "read",
  resource: "milestone",
  title: "List a contract's milestones",
  description: "List the milestones on a milestone-based contract.",
  params: [CONTRACT_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Deel milestones", { contractId });

    return await new DeelClient(ctx).requestAllCursor(
      `/contracts/${encodeURIComponent(contractId)}/milestones`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

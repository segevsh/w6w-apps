import type { ActionDefinition } from "@w6w/types";
import { csv, DeelClient } from "../lib/client.ts";
import { CONTRACT_PARAM } from "../lib/params.ts";

/**
 * `GET /contracts/{contract_id}` — verified against Deel's own OpenAPI
 * document (`ic-endpoints.json`, `get-contract`).
 */
const action: ActionDefinition = {
  key: "contract-get",
  type: "read",
  resource: "contract",
  title: "Get a contract",
  description: "Retrieve one contract with its terms and current status.",
  params: [
    CONTRACT_PARAM,
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "",
      hint: "Comma-separated related resources to include.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Contract" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");

    ctx.log("info", "getting Deel contract", { contractId });

    return await new DeelClient(ctx).request(`/contracts/${encodeURIComponent(contractId)}`, {
      query: { expand: csv(p.expand) },
    });
  },
};

export default action;

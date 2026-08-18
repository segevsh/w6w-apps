import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient } from "../lib/client.ts";
import { CONTRACT_PARAM } from "../lib/params.ts";

/**
 * `POST /contracts/{contract_id}/terminations` — verified against Deel's own
 * OpenAPI document (`ic-endpoints.json`, `create-contract-termination`).
 *
 * Deel models termination as a **resource you create**, not a status you set —
 * which is why there is a matching `DELETE` on the same path to withdraw one.
 * This action creates it; withdrawing is deliberately not exposed, because
 * "undo a termination" is a decision that should be taken in Deel's UI where
 * the consequences are shown.
 */
const action: ActionDefinition = {
  key: "contract-terminate",
  type: "perform",
  resource: "contract",
  title: "Terminate a contract",
  description: "Request termination of a contract.",
  // Two calls would create two termination requests.
  idempotent: false,
  params: [
    CONTRACT_PARAM,
    {
      key: "endDate",
      label: "End Date",
      type: "date",
      required: true,
      default: "",
      hint: "The contract's last working day.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      default: "",
      hint: "Recorded with the termination.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      default: "",
      hint: "Sent to the worker.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Termination" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    const endDate = String(p.endDate ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");
    if (!endDate) throw new Error("`endDate` is required");

    ctx.log("info", "terminating Deel contract", { contractId, endDate });

    return await new DeelClient(ctx).request(
      `/contracts/${encodeURIComponent(contractId)}/terminations`,
      {
        method: "POST",
        // Deel wraps write bodies in a `data` envelope.
        body: { data: compact({ end_date: endDate, reason: p.reason, message: p.message }) },
      },
    );
  },
};

export default action;

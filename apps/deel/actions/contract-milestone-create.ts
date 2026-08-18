import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient } from "../lib/client.ts";
import { CONTRACT_PARAM } from "../lib/params.ts";

/**
 * `POST /contracts/{contract_id}/milestones` — verified against Deel's own
 * OpenAPI document (`ic-endpoints.json`, `create-contract-milestone`).
 *
 * Creating a milestone is how a contractor gets paid for a deliverable, so
 * this is the action a "work approved → pay" workflow ends with.
 */
const action: ActionDefinition = {
  key: "contract-milestone-create",
  type: "perform",
  resource: "milestone",
  title: "Create a milestone",
  description: "Add a payable milestone to a contract.",
  // Each call creates another milestone — and another payment.
  idempotent: false,
  params: [
    CONTRACT_PARAM,
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
      default: null,
      hint: "In the contract's currency.",
    },
    {
      key: "dateSubmitted",
      label: "Date Submitted",
      type: "date",
      default: "",
      hint: "Defaults to today in Deel.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
  ],
  output: [{ key: "data", type: "object", label: "Milestone" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");
    if (!title) throw new Error("`title` is required");
    if (typeof p.amount !== "number") throw new Error("`amount` is required");

    ctx.log("info", "creating Deel milestone", { contractId, title });

    return await new DeelClient(ctx).request(
      `/contracts/${encodeURIComponent(contractId)}/milestones`,
      {
        method: "POST",
        body: {
          data: compact({
            title,
            amount: p.amount,
            date_submitted: p.dateSubmitted,
            description: p.description,
          }),
        },
      },
    );
  },
};

export default action;

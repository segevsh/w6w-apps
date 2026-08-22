import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient } from "../lib/client.ts";

/**
 * `POST /timesheets` — verified against Deel's own OpenAPI document
 * (`ic-endpoints.json`, `create-timesheet`).
 *
 * Logging work against a pay-as-you-go contract, which is what turns hours into
 * an invoice line.
 */
const action: ActionDefinition = {
  key: "timesheet-create",
  type: "perform",
  resource: "timesheet",
  title: "Submit a timesheet",
  description: "Log work against a contract.",
  // Each call logs another entry.
  idempotent: false,
  params: [
    { key: "contractId", label: "Contract ID", type: "string", required: true, default: "" },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      default: null,
      hint: "Hours, days or units — whatever the contract is priced in.",
    },
    {
      key: "dateSubmitted",
      label: "Date",
      type: "date",
      default: "",
      hint: "Defaults to today in Deel.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
  ],
  output: [{ key: "data", type: "object", label: "Timesheet" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");
    if (typeof p.quantity !== "number") throw new Error("`quantity` is required");

    ctx.log("info", "creating Deel timesheet", { contractId, quantity: p.quantity });

    return await new DeelClient(ctx).request("/timesheets", {
      method: "POST",
      body: {
        data: compact({
          contract_id: contractId,
          quantity: p.quantity,
          date_submitted: p.dateSubmitted,
          description: p.description,
        }),
      },
    });
  },
};

export default action;

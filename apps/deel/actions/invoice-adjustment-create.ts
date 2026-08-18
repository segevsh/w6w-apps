import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient } from "../lib/client.ts";

/**
 * `POST /invoice-adjustments` — verified against Deel's own OpenAPI document
 * (`ic-endpoints.json`, `create-invoice-adjustment`).
 *
 * This is how a bonus, expense reimbursement or deduction gets onto a
 * contractor's next invoice — money moves, so it is honestly non-idempotent.
 */
const action: ActionDefinition = {
  key: "invoice-adjustment-create",
  type: "perform",
  resource: "invoiceAdjustment",
  title: "Create an invoice adjustment",
  description: "Add a bonus, expense or deduction to a contract's next invoice.",
  // Each call adds another line — and another payment.
  idempotent: false,
  params: [
    { key: "contractId", label: "Contract ID", type: "string", required: true, default: "" },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      required: true,
      default: "",
      hint: "From Deel's adjustment categories — bonus, expense, deduction and so on.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
      default: null,
      hint: "In the contract's currency. Deductions are their own category, not a negative.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "dateSubmitted",
      label: "Date",
      type: "date",
      default: "",
      hint: "Which pay cycle it lands in. Defaults to today in Deel.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Adjustment" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contractId = String(p.contractId ?? "").trim();
    const categoryId = String(p.categoryId ?? "").trim();
    if (!contractId) throw new Error("`contractId` is required");
    if (!categoryId) throw new Error("`categoryId` is required");
    if (typeof p.amount !== "number") throw new Error("`amount` is required");

    ctx.log("info", "creating Deel invoice adjustment", { contractId, amount: p.amount });

    return await new DeelClient(ctx).request("/invoice-adjustments", {
      method: "POST",
      body: {
        data: compact({
          contract_id: contractId,
          category_id: categoryId,
          amount: p.amount,
          description: p.description,
          date_submitted: p.dateSubmitted,
        }),
      },
    });
  },
};

export default action;

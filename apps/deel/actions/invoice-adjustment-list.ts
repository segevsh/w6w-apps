import type { ActionDefinition } from "@w6w/types";
import { csv, DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /invoice-adjustments` — verified against Deel's own OpenAPI document
 * (`ic-endpoints.json`, `get-invoice-adjustments`).
 *
 * Adjustments are the bonuses, expenses and deductions that ride on a
 * contractor's invoice — the line items a finance workflow reconciles.
 */
const action: ActionDefinition = {
  key: "invoice-adjustment-list",
  type: "read",
  resource: "invoiceAdjustment",
  title: "List invoice adjustments",
  description: "List bonuses, expenses and deductions across contracts.",
  params: [
    ...LIST_PARAMS,
    { key: "contractId", label: "Contract ID", type: "string", default: "" },
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    { key: "dateFrom", label: "From", type: "date", default: "" },
    { key: "dateTo", label: "To", type: "date", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    // The client drops unset values, so no `compact` is needed — and it
    // would widen the type past what a query accepts.
    const query = {
      contract_id: (p.contractId as string) || undefined,
      statuses: csv(p.statuses),
      date_from: (p.dateFrom as string) || undefined,
      date_to: (p.dateTo as string) || undefined,
    };

    ctx.log("info", "listing Deel invoice adjustments", { returnAll, limit });

    return await new DeelClient(ctx).requestAllCursor(
      "/invoice-adjustments",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

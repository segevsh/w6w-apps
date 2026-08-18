import type { ActionDefinition } from "@w6w/types";
import { csv, DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /timesheets` — verified against Deel's own OpenAPI document
 * (`ic-endpoints.json`, `get-timesheets`).
 *
 * Cursor-paginated, like the contract collections.
 */
const action: ActionDefinition = {
  key: "timesheet-list",
  type: "read",
  resource: "timesheet",
  title: "List timesheets",
  description: "List submitted timesheets, optionally filtered by contract or status.",
  params: [
    ...LIST_PARAMS,
    { key: "contractId", label: "Contract ID", type: "string", default: "" },
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      placeholder: "pending,approved",
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

    ctx.log("info", "listing Deel timesheets", { returnAll, limit });

    return await new DeelClient(ctx).requestAllCursor(
      "/timesheets",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

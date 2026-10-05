import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/earnings`
 * Needs the `view_tax_data` or `account` scope.
 */
interface Input {
  year: number;
}

const earningsGet: ActionDefinition<Input> = {
  key: "earnings-get",
  type: "read",
  resource: "payout",
  title: "Get Annual Earnings",
  description:
    "Gross, fees, taxes and net for a tax year, matching the Tax Center. US sellers with the tax center enabled only; 404 outside the account's available years. Needs the `view_tax_data` or `account` scope.",
  params: [{
    "key": "year",
    "label": "Tax year",
    "type": "number",
    "required": true,
    "hint": "4-digit year, from the account's creation year to last year.",
  }],
  output: [{ "key": "year", "type": "number", "label": "Year" }, {
    "key": "gross_cents",
    "type": "number",
    "label": "Gross",
  }, { "key": "net_cents", "type": "number", "label": "Net" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/earnings`, {
      query: { year: input.year },
    });
    const { success: _success, ...rest } = body;
    return rest;
  },
};

export default earningsGet;

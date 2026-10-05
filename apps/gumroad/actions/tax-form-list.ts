import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/tax_forms`
 * Needs the `view_tax_data` or `account` scope.
 */
interface Input {
  year?: number;
}

const taxFormList: ActionDefinition<Input> = {
  key: "tax-form-list",
  type: "read",
  resource: "payout",
  title: "List Tax Forms",
  description:
    "1099-K / 1099-MISC forms for the seller. US sellers with the tax center enabled only. Needs the `view_tax_data` or `account` scope.",
  params: [{
    "key": "year",
    "label": "Tax year",
    "type": "number",
    "hint": "Empty returns every available year; a year outside the available range is a 404.",
  }],
  output: [{ "key": "taxForms", "type": "array", "label": "Tax forms" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/tax_forms`, {
      query: { year: input.year },
    });
    return { taxForms: body.tax_forms ?? [] };
  },
};

export default taxFormList;

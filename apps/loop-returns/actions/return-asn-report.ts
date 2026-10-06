import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * Get Advanced Shipping Notice.
 *
 * `GET /warehouse/reporting/asn`. Dates are `yyyy-mm-dd`; omitted `from` is one week ago, omitted `to` is the end of today, and an invalid date silently falls back to the Unix epoch, so this app validates the format first.
 */
interface Input {
  from?: string;
  to?: string;
}

const action: ActionDefinition<Input> = {
  key: "return-asn-report",
  type: "read",
  resource: "return",
  title: "Get Advanced Shipping Notice",
  description:
    "Pull the packages in a date range with their tracking status, plus order and return information.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "Start date, `yyyy-mm-dd`. Default: one week ago.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "End date, `yyyy-mm-dd`. Default: end of today.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
  ],
  output: [
    { key: "items", type: "array", label: "One entry per package line item" },
  ],

  async execute(input, ctx) {
    for (const [k, v] of [["from", input.from], ["to", input.to]]) {
      if (v !== undefined && v !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
        throw new Error(`${k} must be a yyyy-mm-dd date.`);
      }
    }
    const res = await new LoopClient(ctx).get("/warehouse/reporting/asn", {
      from: input.from,
      to: input.to,
    });
    return { items: Array.isArray(res) ? res : [] };
  },
};

export default action;

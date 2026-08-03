import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, FIELDS_PARAM, OdooClient, splitFields, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  fields?: string;
  context?: Record<string, unknown>;
}

/**
 * `sale.order.read` — fetch specific sales orders by id.
 *
 * The order LINES are a separate model (`sale.order.line`). Reading
 * `order_line` here returns their ids, not their contents — that is how Odoo
 * represents a one-to-many relation over RPC. To get the line detail, feed those
 * ids to Search Records against `sale.order.line`, or filter it by
 * `[["order_id","=",<id>]]`.
 */
const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  resource: "sale.order",
  title: "Get Sales Order",
  description:
    "Read one or more sales orders (`sale.order`) by record id. Note `order_line` comes back as " +
    "a list of line IDs — use Search Records on `sale.order.line` to read the lines themselves.",
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "69",
      hint: "A single id, or several separated by commas.",
    },
    FIELDS_PARAM,
    CONTEXT_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Number of records returned" },
  ],

  async execute(input, ctx) {
    const kwargs: Record<string, unknown> = {};
    const fields = splitFields(input.fields);
    if (fields) kwargs.fields = fields;
    if (input.context) kwargs.context = input.context;

    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "sale.order",
      "read",
      [toIds(input.ids)],
      kwargs,
    );
    return { records, count: records.length };
  },
};

export default getOrder;

import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, FIELDS_PARAM, OdooClient, splitFields, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  fields?: string;
  context?: Record<string, unknown>;
}

/**
 * `product.product.read` — fetch specific product variants by id.
 *
 * Prices are context-sensitive in Odoo: `list_price` is the catalogue price,
 * while the price a given customer actually pays depends on pricelists and is
 * computed, not stored. Reading `list_price` and calling it "the price" is a
 * common mistake — pass a `pricelist` in Context if you need customer-specific
 * pricing.
 */
const getProduct: ActionDefinition<Input> = {
  key: "get-product",
  type: "read",
  resource: "product.product",
  title: "Get Product",
  description:
    "Read one or more product variants (`product.product`) by record id. `list_price` is the " +
    "catalogue price — customer-specific prices come from pricelists, not this field.",
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "61",
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
      "product.product",
      "read",
      [toIds(input.ids)],
      kwargs,
    );
    return { records, count: records.length };
  },
};

export default getProduct;

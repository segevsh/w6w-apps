import type { ActionDefinition } from "@w6w/types";
import {
  CONTEXT_PARAM,
  DOMAIN_PARAM,
  FIELDS_PARAM,
  LIMIT_PARAM,
  OdooClient,
  OFFSET_PARAM,
  ORDER_PARAM,
  type ReadInput,
  RECORDS_OUTPUT,
  searchKwargs,
} from "../lib/client.ts";

/**
 * `product.product.search_read` — the sellable catalogue.
 *
 * ## `product.product` vs `product.template` — pick the right one
 *
 * Odoo splits products in two, and choosing wrongly is a common integration bug:
 *
 *   - `product.template` is the product as a catalogue concept ("T-Shirt").
 *   - `product.product` is a specific VARIANT of it ("T-Shirt, red, large").
 *
 * Order lines, stock and pricing all reference `product.product`, so that is
 * what this action lists — a product id taken from here can be dropped straight
 * into a Create Sales Order line. A product with no variants still has exactly
 * one `product.product` record, so this works for simple catalogues too. To
 * browse templates instead, use Search Records against `product.template`.
 *
 * Verified live (2026-08-03): returned
 * `[{"id":61,"display_name":"[COMM] Communication"},…]` — the `[CODE]` prefix in
 * `display_name` is the product's internal reference.
 */
const listProducts: ActionDefinition<ReadInput> = {
  key: "list-products",
  type: "search",
  resource: "product.product",
  title: "List Products",
  description:
    "Search sellable product variants (`product.product`) — the ids that sales order lines " +
    "reference. For the catalogue-level product instead, use Search Records on " +
    "`product.template`.",
  params: [DOMAIN_PARAM, FIELDS_PARAM, LIMIT_PARAM, OFFSET_PARAM, ORDER_PARAM, CONTEXT_PARAM],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "product.product",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listProducts;

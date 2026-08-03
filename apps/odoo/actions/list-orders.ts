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
 * `sale.order.search_read` — quotations and sales orders.
 *
 * In Odoo a quotation and a sales order are the same record at different points
 * in its lifecycle, tracked by `state`: `draft` and `sent` are quotations,
 * `sale` is a confirmed order, then `done` and `cancel`. So "list my open
 * quotations" is a domain, not a different model.
 *
 * Verified live (2026-08-03): `search_read` on `sale.order` returned
 * `[{"id":69,"display_name":"S00069"},…]`, and a domain of
 * `[["state","=","draft"]]` correctly returned only draft records.
 */
const listOrders: ActionDefinition<ReadInput> = {
  key: "list-orders",
  type: "search",
  resource: "sale.order",
  title: "List Sales Orders",
  description:
    "Search quotations and sales orders (`sale.order`). They share one model — filter by " +
    "`state`: `draft`/`sent` are quotations, `sale` is confirmed, e.g. " +
    '`[["state","=","draft"]]`. Requires the Sales app.',
  params: [DOMAIN_PARAM, FIELDS_PARAM, LIMIT_PARAM, OFFSET_PARAM, ORDER_PARAM, CONTEXT_PARAM],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "sale.order",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listOrders;

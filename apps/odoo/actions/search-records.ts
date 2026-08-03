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

interface Input extends ReadInput {
  model: string;
}

/**
 * `search_read` against ANY model — the general read escape hatch.
 *
 * The named list actions cover the models most workflows want, but Odoo is an
 * ERP: a database may hold accounting entries, stock moves, timesheets,
 * helpdesk tickets, manufacturing orders and a customer's own custom models.
 * Shipping a bespoke action for each is neither possible nor useful, and
 * omitting them would make the app arbitrarily narrow.
 *
 * `search_read` is deliberately the one used, rather than `search` followed by
 * `read`. Odoo's own documentation makes the point: each JSON-RPC call is its
 * own transaction, so a `search` and then a `read` can race a concurrent
 * deletion and fail on a missing record, whereas "Such a problem cannot occur in
 * `search_read`, as the system guarantees proper isolation between
 * transactions". One call is both faster and correct.
 *
 * This action is `search`, not `perform`: it only ever reads.
 */
const searchRecords: ActionDefinition<Input> = {
  key: "search-records",
  type: "search",
  title: "Search Records",
  description:
    "Run `search_read` against any Odoo model — for anything the named actions do not cover, " +
    "such as `sale.order.line`, `account.move`, `project.task` or a custom model. Use List " +
    "Models and Describe Model to find the model and field names.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "project.task",
      hint: "Technical model name, as returned by List Models.",
    },
    DOMAIN_PARAM,
    FIELDS_PARAM,
    LIMIT_PARAM,
    OFFSET_PARAM,
    ORDER_PARAM,
    CONTEXT_PARAM,
  ],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      input.model,
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default searchRecords;

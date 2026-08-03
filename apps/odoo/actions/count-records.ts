import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, DOMAIN_PARAM, OdooClient, toDomain } from "../lib/client.ts";

interface Input {
  model: string;
  domain?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `search_count` — how many records match, without fetching them.
 *
 * The natural way to answer "are there any overdue invoices?" is a `search_read`
 * followed by a length check, and on an ERP that is a genuinely bad idea: it
 * transfers every matching record to decide a single number. `search_count`
 * answers it in the database.
 *
 * The argument shape differs from `search_read` and this is the easy mistake:
 * `search_count` takes the domain POSITIONALLY — `args: [[domain]]`, i.e. a
 * one-element args list whose element IS the domain. Verified live
 * (2026-08-03): `args: [[["name","like","W6W Probe"]]]` returned `2`, and `0`
 * after the matching records were deleted.
 */
const countRecords: ActionDefinition<Input> = {
  key: "count-records",
  type: "read",
  title: "Count Records",
  description:
    "Count the records matching a domain on any model, without transferring them. Much cheaper " +
    "than listing records just to count them.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "crm.lead",
      hint: "Technical model name, as returned by List Models.",
    },
    DOMAIN_PARAM,
    CONTEXT_PARAM,
  ],
  output: [{ key: "count", type: "number", label: "Number of matching records" }],

  async execute(input, ctx) {
    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const count = await OdooClient.fromConnection(ctx).call<number>(
      input.model,
      "search_count",
      [toDomain(input.domain)],
      kwargs,
    );
    return { count };
  },
};

export default countRecords;

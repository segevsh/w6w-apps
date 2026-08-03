import type { ActionDefinition } from "@w6w/types";
import {
  CONTEXT_PARAM,
  DOMAIN_PARAM,
  LIMIT_PARAM,
  OdooClient,
  OFFSET_PARAM,
  type ReadInput,
  RECORDS_OUTPUT,
  searchKwargs,
} from "../lib/client.ts";

/**
 * `ir.model.search_read` — discover which models this database actually has.
 *
 * ## Why an app needs a discovery action at all
 *
 * Odoo's API surface is not fixed by its version; it is whatever that particular
 * database has installed. `crm.lead` exists only with the CRM app, `sale.order`
 * only with Sales, and a customer's own custom modules add models this pack has
 * never heard of. No manifest can enumerate that, so it is answered at runtime.
 *
 * `ir.model` is Odoo's registry of models, itself a model — every installed
 * model has a row here with its technical `model` name and human `name`.
 *
 * Verified live (2026-08-03): returned
 * `[{"id":2327,"display_name":"Account"},…]`.
 */
const listModels: ActionDefinition<ReadInput> = {
  key: "list-models",
  type: "search",
  resource: "ir.model",
  title: "List Models",
  description:
    "Discover the models installed on this Odoo database (`ir.model`). Which models exist " +
    "depends on the installed apps, so check here before targeting one — e.g. filter with " +
    '`[["model","like","crm"]]`.',
  params: [
    { ...DOMAIN_PARAM, hint: 'Odoo domain over `ir.model`, e.g. `[["model","like","sale"]]`.' },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "model,name",
      hint: "Comma-separated fields to return. `model` is the technical name you pass to other " +
        "actions; `name` is the human label.",
    },
    LIMIT_PARAM,
    OFFSET_PARAM,
    CONTEXT_PARAM,
  ],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "ir.model",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listModels;

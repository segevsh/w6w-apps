import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, FIELDS_PARAM, OdooClient, splitFields, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  fields?: string;
  context?: Record<string, unknown>;
}

/**
 * `crm.lead.read` — fetch specific leads or opportunities by id.
 *
 * As with every `read` in this app, ids that no longer exist are skipped rather
 * than raising, so `count` is the honest way to detect a partial result.
 */
const getLead: ActionDefinition<Input> = {
  key: "get-lead",
  type: "read",
  resource: "crm.lead",
  title: "Get Lead",
  description:
    "Read one or more CRM leads or opportunities (`crm.lead`) by record id. Missing ids are " +
    "skipped rather than raising — compare `count` against the ids you asked for.",
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "27",
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
      "crm.lead",
      "read",
      [toIds(input.ids)],
      kwargs,
    );
    return { records, count: records.length };
  },
};

export default getLead;

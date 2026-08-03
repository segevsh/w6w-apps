import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, OdooClient, splitFields } from "../lib/client.ts";

interface Input {
  model: string;
  fields?: string;
  attributes?: string;
  context?: Record<string, unknown>;
}

/**
 * `fields_get` — the field schema of a model, straight from the ORM.
 *
 * This is the companion to List Models and the thing that makes the rest of the
 * app usable: it tells you what a field is called (`email_from`, not `email`),
 * what type it is, whether it is required, and for selection fields what values
 * it accepts. Guessing Odoo field names is the single biggest time sink when
 * integrating with it.
 *
 * `fields_get` is a model-level method, so the recordset is empty: `args: []`,
 * with everything in `kwargs`. Verified live (2026-08-03) —
 * `{allfields: ["email_from"], attributes: ["string","type"]}` on `crm.lead`
 * returned `{"email_from":{"string":"Email","type":"char"}}`.
 *
 * `attributes` defaults to a useful, narrow set rather than everything. The full
 * response for a model like `crm.lead` is very large — it includes help text and
 * translations for hundreds of fields — and a workflow rarely needs all of it.
 */
const describeModel: ActionDefinition<Input> = {
  key: "describe-model",
  type: "read",
  resource: "ir.model.fields",
  title: "Describe Model",
  description:
    "List a model's fields, types and requiredness via the ORM's `fields_get`. Use this to " +
    "discover exact Odoo field names before writing records — they are often not what you would " +
    "guess (a lead's email address is `email_from`).",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "crm.lead",
      hint: "Technical model name, as returned by List Models.",
    },
    {
      key: "fields",
      label: "Only these fields",
      type: "string",
      hint:
        "Comma-separated field names to describe. Leave empty to describe every field — which " +
        "for a model like `crm.lead` is a very large response.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "string",
      default: "string,type,required,relation,selection",
      hint:
        "Comma-separated attributes to return per field. `relation` names the target model of a " +
        "relational field; `selection` lists a selection field's allowed values.",
    },
    CONTEXT_PARAM,
  ],
  output: [
    { key: "fields", type: "object", label: "Field name -> attributes" },
    { key: "count", type: "number", label: "Number of fields described" },
  ],

  async execute(input, ctx) {
    const kwargs: Record<string, unknown> = {};
    const only = splitFields(input.fields);
    if (only) kwargs.allfields = only;
    const attributes = splitFields(input.attributes);
    if (attributes) kwargs.attributes = attributes;
    if (input.context) kwargs.context = input.context;

    const fields = await OdooClient.fromConnection(ctx).call<Record<string, unknown>>(
      input.model,
      "fields_get",
      [],
      kwargs,
    );
    return { fields, count: Object.keys(fields ?? {}).length };
  },
};

export default describeModel;

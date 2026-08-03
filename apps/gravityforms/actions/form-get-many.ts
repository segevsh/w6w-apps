import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formIds?: Array<string | number>;
}

/**
 * `GET /gf/v2/forms` — every form on the site.
 *
 * With no parameters the response is "a JSON object keyed by form ID – each
 * with form details" (id, title, entry count). Passing `include` as an indexed
 * array of form IDs returns the COMPLETE form objects instead, with every field
 * configuration and setting.
 *
 * The vendor returns that map as the whole body, with no envelope, so it is
 * nested under `forms` here — an action has to declare an output shape, and an
 * arbitrarily-keyed top-level object has none to declare.
 *
 * Capability: `gravityforms_edit_forms`.
 */
const formGetMany: ActionDefinition<Input> = {
  key: "form-get-many",
  type: "search",
  resource: "form",
  title: "Get Many Forms",
  description:
    "List the forms on this site, keyed by form ID. Supply form IDs to get the full form objects.",
  params: [
    {
      key: "formIds",
      label: "Form IDs",
      type: "multiselect",
      hint:
        "Sent as the `include` parameter. Leave empty for the summary listing (id, title, entry " +
        "count); supply IDs to get complete form objects with all fields and settings.",
    },
  ],
  output: [
    { key: "forms", type: "object", label: "Forms keyed by form ID" },
  ],

  async execute(input, ctx) {
    const client = GravityFormsClient.fromConnection(ctx);
    const forms = await client.request<Record<string, unknown>>("/forms", {
      query: { include: input.formIds },
    });
    return { forms: forms ?? {} };
  },
};

export default formGetMany;

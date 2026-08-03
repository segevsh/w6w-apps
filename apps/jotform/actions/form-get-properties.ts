import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  formId: string;
  propertyKey?: string;
}

/**
 * GET /form/{formID}/properties — a form's settings: width, fonts, redirect
 * behaviour, submission limits, notification emails, form strings.
 *
 * With a `propertyKey` this calls the documented single-property variant,
 * GET /form/{formID}/properties/{propertyKey}, instead.
 */
const formGetProperties: ActionDefinition<Input> = {
  key: "form-get-properties",
  type: "read",
  resource: "form",
  title: "Get Form Properties",
  description: "Retrieve a form's settings — all of them, or one property by key.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
    {
      key: "propertyKey",
      label: "Property key",
      type: "string",
      hint: "Leave empty for every property. Example: `formWidth`, `thankurl`, `activeRedirect`.",
    },
  ],
  output: [
    { key: "properties", type: "object", label: "Form properties" },
  ],

  async execute(input, ctx) {
    const suffix = input.propertyKey
      ? `/properties/${encodeURIComponent(input.propertyKey)}`
      : "/properties";
    const properties = await new JotformClient(ctx).content<unknown>(
      `/form/${encodeURIComponent(input.formId)}${suffix}`,
    );
    return { properties };
  },
};

export default formGetProperties;

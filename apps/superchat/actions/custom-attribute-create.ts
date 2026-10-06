import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  name: string;
  type: string;
  optionValues?: string[];
  readOnly?: boolean;
}

/** Define a new custom contact attribute (text, number, date, date-time, single-select or multi-select). */
const customAttributeCreate: ActionDefinition<Input> = {
  key: "custom-attribute-create",
  type: "perform",
  resource: "custom-attribute",
  title: "Create Custom Attribute",
  description:
    "Define a new custom contact attribute (text, number, date, date-time, single-select or multi-select).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "required": true,
      "options": [
        { "value": "text", "label": "Text" },
        { "value": "number", "label": "Number" },
        { "value": "dateonly", "label": "Date" },
        { "value": "datetime", "label": "Date and time" },
        { "value": "single_select", "label": "Single select" },
        { "value": "multi_select", "label": "Multi select" },
      ],
    },
    {
      "key": "optionValues",
      "label": "Option values",
      "type": "json",
      "hint": "Array of option strings. Used by (and required for) the select types.",
    },
    {
      "key": "readOnly",
      "label": "Read only",
      "type": "boolean",
      "hint": "Only integrations can set its value. Fixed at creation.",
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Attribute ID" },
    { "key": "name", "type": "string", "label": "Name" },
  ],

  execute(input, ctx) {
    const isSelect = input.type === "single_select" || input.type === "multi_select";
    if (isSelect && !(input.optionValues?.length)) {
      throw new Error("Superchat: select attributes need at least one option value");
    }
    return new SuperchatClient(ctx).request("/custom-attributes", {
      method: "POST",
      body: {
        name: input.name,
        type: input.type,
        resource: "contact",
        ...(isSelect ? { option_values: input.optionValues } : {}),
        ...(input.readOnly !== undefined ? { read_only: input.readOnly } : {}),
      },
    });
  },
};

export default customAttributeCreate;

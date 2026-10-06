import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";

/**
 * Create Person Field — `POST /v1/fields` with an array of field definitions. Verified against
 * the OpenAPI document (`CreateFields`, schema `IPersonField`), fetched 2026-10-06. The schema
 * requires `name`, `type`, `readOnly` and `array`, all of which this action always sends.
 */
interface Input {
  name: string;
  title?: string;
  type: "string" | "number" | "boolean" | "integer" | "any";
  format?: "date" | "date-time";
  array?: boolean;
  tooltip?: string;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "fields",
  title: "Create Person Field",
  description: "Create a custom person field so it can be set from Create or Update Person.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Field name",
      type: "string",
      required: true,
      hint: "The unique ID used to refer to the field in every API call, e.g. `plan`.",
    },
    { key: "title", label: "Title", type: "string", hint: "Human-readable name." },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "string",
      options: [
        { value: "string", label: "Text" },
        { value: "number", label: "Number" },
        { value: "integer", label: "Integer" },
        { value: "boolean", label: "Boolean" },
        { value: "any", label: "Any" },
      ],
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      hint: "Text fields only: store the value as a date or a date-time.",
      options: [{ value: "date", label: "Date" }, { value: "date-time", label: "Date and time" }],
    },
    { key: "array", label: "Holds a list of values", type: "boolean", default: false },
    { key: "tooltip", label: "Tooltip", type: "string" },
  ],
  output: [{ key: "items", type: "array", label: "The created field definitions" }],

  async execute(input, ctx) {
    const name = (input.name ?? "").trim();
    if (!name) throw new Error("`name` is required.");
    if (!input.type) throw new Error("`type` is required.");
    const field: Record<string, unknown> = {
      name,
      type: input.type,
      readOnly: false,
      array: input.array === true,
    };
    if (input.title) field.title = input.title;
    if (input.format) field.format = input.format;
    if (input.tooltip) field.tooltip = input.tooltip;
    return await new EnchargeClient(ctx).request("POST", "/fields", { body: [field] });
  },
};

export default fieldCreate;

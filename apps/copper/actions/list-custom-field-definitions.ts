import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /custom_field_definitions` — the account's custom field definitions.
 *
 * The lookup every write action's `customFields` param depends on. Copper stores
 * custom values as an array of `{custom_field_definition_id, value}` pairs with
 * no field name attached, so a value is unreadable — and unwritable — without
 * this list.
 *
 * Each definition carries what you need to write a correct value:
 *
 *   - `data_type` — one of String, Text, Dropdown, Date, Checkbox, Float, URL,
 *     Percentage, Currency, Connect, MultiSelect. It decides whether `value` is a
 *     string, a number, a boolean, a Unix timestamp or an option id.
 *   - `options` — the permitted option objects, for Dropdown (and MultiSelect)
 *     types. A Dropdown's `value` is an option **id**, not its label.
 *   - `available_on` — which record types the field appears on ("lead",
 *     "person", "opportunity", "company", "project", "task"), so a field can be
 *     matched to the action that may set it.
 */
const listCustomFieldDefinitions: ActionDefinition<Input> = {
  key: "list-custom-field-definitions",
  type: "search",
  resource: "custom-field",
  title: "List Custom Field Definitions",
  description:
    "List the account's custom field definitions — their ids, data types, dropdown options and " +
    "which record types they appear on. Needed to read or write any custom field value.",
  params: [],
  output: [{ key: "definitions", type: "array", label: "Custom field definitions" }],

  async execute(_input, ctx) {
    const definitions = await new CopperClient(ctx).request<unknown[]>("/custom_field_definitions");
    return { definitions: definitions ?? [] };
  },
};

export default listCustomFieldDefinitions;

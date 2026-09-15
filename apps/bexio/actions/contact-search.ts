import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery, type SearchCriterion } from "../lib/client.ts";

interface Input {
  field: string;
  value: string;
  criteria?: SearchCriterion["criteria"];
  orderBy?: "id" | "nr" | "name_1" | "updated_at";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * bexio's search is a single-criterion form here for simplicity; the vendor
 * endpoint actually accepts an ARRAY of `{field, value, criteria}` objects
 * (AND-combined), documented under "Errors > Search" in the API reference.
 * One criterion covers the common case (find by number, email, name); a
 * caller needing a compound search can chain this action or use `Overrides`.
 */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by a single field/value/criteria triple.",
  params: [
    {
      key: "field",
      label: "Field",
      type: "string",
      required: true,
      hint: 'e.g. "name_1", "mail", "nr".',
    },
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "criteria",
      label: "Criteria",
      type: "select",
      default: "like",
      options: [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not equals" },
        { value: ">", label: "Greater than" },
        { value: "<", label: "Less than" },
        { value: ">=", label: "Greater or equal" },
        { value: "<=", label: "Less or equal" },
        { value: "like", label: "Contains (partial match)" },
        { value: "not_like", label: "Does not contain" },
        { value: "is_null", label: "Is null" },
        { value: "not_null", label: "Is not null" },
      ],
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "nr", label: "Contact number" },
        { value: "name_1", label: "Name" },
        { value: "updated_at", label: "Last updated" },
      ],
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name_1", type: "string", label: "Name / company" },
  ],

  execute(input, ctx) {
    const criteria: SearchCriterion[] = [
      { field: input.field, value: input.value, criteria: input.criteria },
    ];
    return new BexioClient(ctx).search("/2.0/contact/search", criteria, listQuery(input));
  },
};

export default contactSearch;

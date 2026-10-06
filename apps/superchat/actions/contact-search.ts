import type { ActionDefinition } from "@w6w/types";
import { type ListResult, pageQuery, SuperchatClient } from "../lib/client.ts";

interface Input {
  field: string;
  value: string;
  attributeId?: string;
  limit?: number;
  after?: string;
  before?: string;
}

/** Find contacts by an exact email, phone, Instagram username or custom-attribute value. The API accepts exactly one search expression per call. */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Find contacts by an exact email, phone, Instagram username or custom-attribute value. The API accepts exactly one search expression per call.",
  params: [
    {
      "key": "field",
      "label": "Search by",
      "type": "select",
      "required": true,
      "options": [{ "value": "mail", "label": "Email" }, { "value": "phone", "label": "Phone" }, {
        "value": "instagram",
        "label": "Instagram username",
      }, { "value": "custom_attribute", "label": "Custom attribute" }],
    },
    {
      "key": "value",
      "label": "Value",
      "type": "string",
      "required": true,
      "hint": "Exact match. Phone numbers in E.164.",
    },
    {
      "key": "attributeId",
      "label": "Custom attribute ID",
      "type": "string",
      "hint": "Required when searching by custom attribute (or a built-in attribute name).",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100.",
      "default": 50,
      "validation": { "min": 1, "max": 100, "integer": true },
    },
    {
      "key": "after",
      "label": "After",
      "type": "string",
      "hint": "Cursor: pass the previous page's `nextCursor` to get the next page.",
    },
    {
      "key": "before",
      "label": "Before",
      "type": "string",
      "hint":
        "Cursor for paging backwards (the previous page's `previous_cursor`). Use either After or Before, not both.",
    },
  ],
  output: [
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "nextCursor", "type": "string", "label": "Next page cursor (null on the last page)" },
    { "key": "pagination", "type": "object", "label": "Pagination cursors and URLs" },
  ],

  async execute(input, ctx) {
    const expression = input.field === "custom_attribute"
      ? {
        field: "custom_attribute",
        identifier: input.attributeId,
        operator: "=",
        value: input.value,
      }
      : { field: input.field, operator: "=", value: input.value };
    if (input.field === "custom_attribute" && !input.attributeId) {
      throw new Error("Superchat: searching by custom attribute needs a custom attribute ID");
    }
    const page = await new SuperchatClient(ctx).request<Omit<ListResult, "nextCursor">>(
      "/contacts/search",
      { method: "POST", query: pageQuery(input), body: { query: { value: [expression] } } },
    );
    return { ...page, nextCursor: page?.pagination?.next_cursor ?? null };
  },
};

export default contactSearch;

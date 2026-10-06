import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  query?: string;
  identification?: string;
  name?: string;
  type?: string;
  mode?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts (clients and providers), 30 per page.",
  params: [
    {
      "key": "start",
      "label": "Start",
      "type": "number",
      "default": 0,
      "hint": "Zero-based offset of the first record to return (NOT a record id).",
      "validation": {
        "min": 0,
        "integer": true,
      },
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "default": 30,
      "hint": "Records to return. Alegra's default AND maximum is 30; a larger value is an error.",
      "validation": {
        "min": 1,
        "max": 30,
        "integer": true,
      },
    },
    {
      "key": "orderDirection",
      "label": "Order direction",
      "type": "select",
      "options": [
        {
          "value": "ASC",
          "label": "Ascending",
        },
        {
          "value": "DESC",
          "label": "Descending",
        },
      ],
      "hint": "Defaults to ASC.",
    },
    {
      "key": "orderField",
      "label": "Order field",
      "type": "string",
      "hint": "One of id, name, email.",
    },
    {
      "key": "query",
      "label": "Search",
      "type": "string",
      "hint": "Free-text search.",
    },
    {
      "key": "identification",
      "label": "Identification",
      "type": "string",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "client",
          "label": "Client",
        },
        {
          "value": "provider",
          "label": "Provider",
        },
      ],
    },
    {
      "key": "mode",
      "label": "Mode",
      "type": "select",
      "options": [
        {
          "value": "simple",
          "label": "Simple",
        },
        {
          "value": "advanced",
          "label": "Advanced",
        },
      ],
      "hint": "simple returns a lighter record.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "total", type: "number", label: "Total matching records (null when not reported)" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.list("/contacts", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      query: input.query,
      identification: input.identification,
      name: input.name,
      type: input.type,
      mode: input.mode,
      limit: listLimit(input.limit),
    });
  },
};

export default contactList;

import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  query?: string;
  name?: string;
  reference?: string;
  type?: string;
  status?: string;
  idItemCategory?: string;
  idWarehouse?: string;
  mode?: string;
}

const itemList: ActionDefinition<Input> = {
  key: "item-list",
  type: "search",
  resource: "item",
  title: "List Items",
  description: "List products and services, 30 per page.",
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
      "hint": "One of name, id, reference, description.",
    },
    {
      "key": "query",
      "label": "Search",
      "type": "string",
      "hint": "Matches name or reference.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "reference",
      "label": "Reference",
      "type": "string",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "string",
      "hint": "simple or kit.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "Active",
        },
        {
          "value": "inactive",
          "label": "Inactive",
        },
      ],
    },
    {
      "key": "idItemCategory",
      "label": "Item category ID",
      "type": "string",
    },
    {
      "key": "idWarehouse",
      "label": "Warehouse ID",
      "type": "string",
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
      "hint": "simple omits category, attachments, inventory detail and images.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "total", type: "number", label: "Total matching records (null when not reported)" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.list("/items", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      query: input.query,
      name: input.name,
      reference: input.reference,
      type: input.type,
      status: input.status,
      idItemCategory: input.idItemCategory,
      idWarehouse: input.idWarehouse,
      mode: input.mode,
      limit: listLimit(input.limit),
    });
  },
};

export default itemList;

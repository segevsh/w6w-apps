import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  clientId?: string;
  clientName?: string;
  itemId?: string;
  number?: string;
  date?: string;
}

const estimateList: ActionDefinition<Input> = {
  key: "estimate-list",
  type: "search",
  resource: "estimate",
  title: "List Estimates",
  description: "List quotes (cotizaciones), 30 per page.",
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
      "hint": "One of id, name, date, dueDate.",
    },
    {
      "key": "clientId",
      "label": "Client ID",
      "type": "string",
    },
    {
      "key": "clientName",
      "label": "Client name",
      "type": "string",
    },
    {
      "key": "itemId",
      "label": "Item ID",
      "type": "string",
    },
    {
      "key": "number",
      "label": "Number",
      "type": "string",
      "hint": "Prefix and/or number.",
    },
    {
      "key": "date",
      "label": "Date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "total", type: "number", label: "Total matching records (null when not reported)" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.list("/estimates", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      client_id: input.clientId,
      client_name: input.clientName,
      item_id: input.itemId,
      number: input.number,
      date: input.date,
      limit: listLimit(input.limit),
    });
  },
};

export default estimateList;

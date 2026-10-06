import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  status?: string;
  billNumber?: string;
  clientId?: string;
  providerName?: string;
  itemId?: string;
  date?: string;
  dueDate?: string;
}

const billList: ActionDefinition<Input> = {
  key: "bill-list",
  type: "search",
  resource: "bill",
  title: "List Supplier Bills",
  description: "List supplier bills (facturas de proveedor), 30 per page.",
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
      "hint": "Order field as accepted by Alegra for supplier bills.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "string",
      "hint": "open, closed or void.",
    },
    {
      "key": "billNumber",
      "label": "Bill number",
      "type": "string",
    },
    {
      "key": "clientId",
      "label": "Provider ID",
      "type": "string",
    },
    {
      "key": "providerName",
      "label": "Provider name",
      "type": "string",
    },
    {
      "key": "itemId",
      "label": "Item ID",
      "type": "string",
    },
    {
      "key": "date",
      "label": "Date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "dueDate",
      "label": "Due date",
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
    return await client.list("/bills", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      status: input.status,
      billNumber: input.billNumber,
      client_id: input.clientId,
      provider_name: input.providerName,
      item_id: input.itemId,
      date: input.date,
      dueDate: input.dueDate,
      limit: listLimit(input.limit),
    });
  },
};

export default billList;

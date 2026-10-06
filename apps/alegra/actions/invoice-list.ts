import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  status?: string;
  clientId?: string;
  clientName?: string;
  clientIdentification?: string;
  numberFull?: string;
  itemId?: string;
  date?: string;
  dateAfter?: string;
  dateBefore?: string;
  dueDate?: string;
  dueDateAfter?: string;
  dueDateBefore?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Sales Invoices",
  description: "List sales invoices, 30 per page (the default and the maximum).",
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
      "hint": "One of id, name, date, dueDate, status.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "string",
      "hint": "open, closed, draft or void; several separated by commas.",
    },
    {
      "key": "clientId",
      "label": "Client ID",
      "type": "string",
      "hint": "Matches invoices whose client id CONTAINS this value.",
    },
    {
      "key": "clientName",
      "label": "Client name",
      "type": "string",
    },
    {
      "key": "clientIdentification",
      "label": "Client identification",
      "type": "string",
    },
    {
      "key": "numberFull",
      "label": "Full number",
      "type": "string",
      "hint": "Prefix plus number, e.g. A-520.",
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
      "hint": "Exact invoice date, YYYY-MM-DD.",
    },
    {
      "key": "dateAfter",
      "label": "Date after",
      "type": "string",
      "hint": "YYYY-MM-DD; from the NEXT day onward.",
    },
    {
      "key": "dateBefore",
      "label": "Date before",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "dueDate",
      "label": "Due date",
      "type": "string",
      "hint": "Exact due date, YYYY-MM-DD.",
    },
    {
      "key": "dueDateAfter",
      "label": "Due date after",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "dueDateBefore",
      "label": "Due date before",
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
    return await client.list("/invoices", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      status: input.status,
      client_id: input.clientId,
      client_name: input.clientName,
      client_identification: input.clientIdentification,
      numberTemplate_fullNumber: input.numberFull,
      item_id: input.itemId,
      date: input.date,
      date_after: input.dateAfter,
      date_before: input.dateBefore,
      dueDate: input.dueDate,
      dueDate_after: input.dueDateAfter,
      dueDate_before: input.dueDateBefore,
      limit: listLimit(input.limit),
    });
  },
};

export default invoiceList;

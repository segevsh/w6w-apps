import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, listLimit } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  orderDirection?: string;
  orderField?: string;
  type?: string;
  clientId?: string;
  conciliationId?: string;
  id?: string;
  includeUnconciliated?: boolean;
}

const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "List incoming and outgoing payments, 30 per page.",
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
      "hint": "One of id, number, date, type.",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "in",
          "label": "Incoming",
        },
        {
          "value": "out",
          "label": "Outgoing",
        },
      ],
    },
    {
      "key": "clientId",
      "label": "Client ID",
      "type": "string",
    },
    {
      "key": "conciliationId",
      "label": "Reconciliation ID",
      "type": "string",
    },
    {
      "key": "id",
      "label": "Payment ID",
      "type": "string",
      "hint": "Filter to specific ids.",
    },
    {
      "key": "includeUnconciliated",
      "label": "Include unreconciled",
      "type": "boolean",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "total", type: "number", label: "Total matching records (null when not reported)" },
  ],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.list("/payments", {
      start: input.start,
      order_direction: input.orderDirection,
      order_field: input.orderField,
      type: input.type,
      client_id: input.clientId,
      conciliation_id: input.conciliationId,
      id: input.id,
      includeUnconciliated: input.includeUnconciliated,
      limit: listLimit(input.limit),
    });
  },
};

export default paymentList;

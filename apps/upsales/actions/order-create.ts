import type { ActionDefinition } from "@w6w/types";
import { buildBody, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/orders` — Create a order or opportunity.
 */
interface Input {
  description?: string;
  date?: string;
  closeDate?: string;
  notes?: string;
  clientId: number;
  userId?: number;
  contactId?: number;
  stageId?: number;
  probability?: number;
  orderRows?: unknown;
  fields?: unknown;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order or Opportunity",
  description: "Create a order or opportunity.",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "date",
      "label": "Date",
      "type": "string",
      "hint": "Date as YYYY-MM-DD.",
    },
    {
      "key": "closeDate",
      "label": "Close date",
      "type": "string",
      "hint": "Date as YYYY-MM-DD.",
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "text",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "userId",
      "label": "Owner user ID",
      "type": "number",
    },
    {
      "key": "contactId",
      "label": "Contact ID",
      "type": "number",
    },
    {
      "key": "stageId",
      "label": "Stage ID",
      "type": "number",
      "hint": "From List Order Stages.",
    },
    {
      "key": "probability",
      "label": "Probability %",
      "type": "number",
      "hint": "100 makes it an order; 1-99 an opportunity; 0 is lost.",
    },
    {
      "key": "orderRows",
      "label": "Order rows",
      "type": "json",
      "hint": "Array of rows: {quantity, price, listPrice, purchaseCost, product:{id}}.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created order or opportunity" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      date: input.date,
      closeDate: input.closeDate,
      notes: input.notes,
      client: ref(input.clientId),
      user: ref(input.userId),
      contact: ref(input.contactId),
      stage: ref(input.stageId),
      probability: input.probability,
      orderRow: input.orderRows,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/orders", { body });
    return { data };
  },
};

export default orderCreate;

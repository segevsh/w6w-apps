import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/orders/{id}` — Update a order or opportunity.
 */
interface Input {
  id: number;
  description?: string;
  date?: string;
  closeDate?: string;
  notes?: string;
  clientId?: number;
  userId?: number;
  contactId?: number;
  stageId?: number;
  probability?: number;
  orderRows?: unknown;
  fields?: unknown;
}

const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order or Opportunity",
  description: "Update a order or opportunity.",
  idempotent: true,
  params: [
    idParam("id", "Order or Opportunity ID"),
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
  output: [{ key: "data", type: "object", label: "The updated order or opportunity" }],

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
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/orders/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default orderUpdate;

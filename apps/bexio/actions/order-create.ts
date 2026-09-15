import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  title?: string;
  contactId?: number;
  userId?: number;
  languageId?: number;
  currencyId?: number;
  isValidFrom?: string;
  header?: string;
  footer?: string;
  positions?: unknown[];
}

/** See invoice-create for why `positions` stays a raw JSON array. */
const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description: 'Create an order (kb_order, "Auftrag").',
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string" },
    { key: "contactId", label: "Contact ID", type: "number" },
    { key: "userId", label: "User ID", type: "number" },
    { key: "languageId", label: "Language ID", type: "number" },
    { key: "currencyId", label: "Currency ID", type: "number" },
    { key: "isValidFrom", label: "Order date", type: "date" },
    { key: "header", label: "Header text", type: "text" },
    { key: "footer", label: "Footer text", type: "text" },
    {
      key: "positions",
      label: "Positions (line items)",
      type: "json",
      hint: "Array of bexio position objects, e.g. " +
        '`{"type":"KbPositionCustom","amount":"1","unit_price":"100.00","text":"Consulting"}`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Order number" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/kb_order", {
      title: input.title,
      contact_id: input.contactId,
      user_id: input.userId,
      language_id: input.languageId,
      currency_id: input.currencyId,
      is_valid_from: input.isValidFrom,
      header: input.header,
      footer: input.footer,
      positions: input.positions,
    });
  },
};

export default orderCreate;

import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  title?: string;
  contactId?: number;
  userId?: number;
  languageId?: number;
  bankAccountId?: number;
  currencyId?: number;
  mwstType?: number;
  mwstIsNet?: boolean;
  isValidFrom?: string;
  isValidTo?: string;
  header?: string;
  footer?: string;
  positions?: unknown[];
}

/**
 * bexio's OpenAPI document marks no field REQUIRED on this endpoint (the
 * `Invoice` schema's `required` array is empty for create, unlike e.g.
 * `pr_project` which lists four), so nothing here is forced — an invoice
 * created with no fields is valid on the wire, even if useless in practice.
 * `positions` is left as raw JSON: bexio's line items are a 6-way union
 * (`PositionCustom`, `PositionArticle`, `PositionText`, `PositionSubtotal`,
 * `PositionPagebreak`, `PositionDiscount`), discriminated by a literal `type`
 * string that must be spelled exactly `KbPositionCustom` / `KbPositionArticle`
 * / etc. — modeling all six as first-class params would be several actions'
 * worth of surface for one field.
 */
const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    'Create an invoice (kb_invoice, "Rechnung"). Created as a draft — see invoice-issue.',
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string" },
    { key: "contactId", label: "Contact ID", type: "number", hint: "References a contact." },
    { key: "userId", label: "User ID", type: "number", hint: "The invoice's owning user." },
    { key: "languageId", label: "Language ID", type: "number" },
    { key: "bankAccountId", label: "Bank account ID", type: "number" },
    { key: "currencyId", label: "Currency ID", type: "number" },
    {
      key: "mwstType",
      label: "VAT type",
      type: "select",
      options: [
        { value: 0, label: "Included in prices" },
        { value: 1, label: "Excluded from prices" },
        { value: 2, label: "No VAT" },
      ],
    },
    { key: "mwstIsNet", label: "Net prices (VAT excluded)", type: "boolean" },
    { key: "isValidFrom", label: "Invoice date", type: "date" },
    { key: "isValidTo", label: "Due date", type: "date" },
    { key: "header", label: "Header text", type: "text" },
    { key: "footer", label: "Footer text", type: "text" },
    {
      key: "positions",
      label: "Positions (line items)",
      type: "json",
      hint: "Array of bexio position objects. Custom line: " +
        '`{"type":"KbPositionCustom","amount":"1","unit_price":"100.00","text":"Consulting"}`. ' +
        'Article line: `{"type":"KbPositionArticle","article_id":4,"amount":"2"}`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Invoice number" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/kb_invoice", {
      title: input.title,
      contact_id: input.contactId,
      user_id: input.userId,
      language_id: input.languageId,
      bank_account_id: input.bankAccountId,
      currency_id: input.currencyId,
      mwst_type: input.mwstType,
      mwst_is_net: input.mwstIsNet,
      is_valid_from: input.isValidFrom,
      is_valid_to: input.isValidTo,
      header: input.header,
      footer: input.footer,
      positions: input.positions,
    });
  },
};

export default invoiceCreate;

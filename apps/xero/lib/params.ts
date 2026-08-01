import type { Param } from "@w6w/types";

export const contactId: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "string",
  required: true,
  hint: "The Xero ContactID (GUID).",
};

export const invoiceId: Param = {
  key: "invoiceId",
  label: "Invoice ID",
  type: "string",
  required: true,
  hint: "The Xero InvoiceID (GUID) or InvoiceNumber.",
};

export const bankTransactionId: Param = {
  key: "bankTransactionId",
  label: "Bank Transaction ID",
  type: "string",
  required: true,
  hint: "The Xero BankTransactionID (GUID).",
};

export const itemId: Param = {
  key: "itemId",
  label: "Item ID",
  type: "string",
  required: true,
  hint: "The Xero ItemID (GUID) or item Code.",
};

/** Xero's `where`/`order` filtering, shared by every list endpoint. */
export const listFilters: Param[] = [
  {
    key: "where",
    label: "Where",
    type: "string",
    advanced: true,
    hint: 'Xero\'s filtering syntax, e.g. `Status=="ACTIVE"`.',
  },
  {
    key: "order",
    label: "Order by",
    type: "string",
    advanced: true,
    placeholder: "Name ASC",
  },
];

/** Xero paginates list endpoints at 100 records per page, 1-based. */
export const page: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { min: 1, integer: true },
  hint: "Xero returns 100 records per page.",
};

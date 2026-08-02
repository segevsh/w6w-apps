import type { Param } from "@w6w/types";

export const customerId: Param = {
  key: "customerId",
  label: "Customer ID",
  type: "string",
  required: true,
  hint: "The QuickBooks Customer Id.",
};

export const invoiceId: Param = {
  key: "invoiceId",
  label: "Invoice ID",
  type: "string",
  required: true,
  hint: "The QuickBooks Invoice Id.",
};

export const vendorId: Param = {
  key: "vendorId",
  label: "Vendor ID",
  type: "string",
  required: true,
  hint: "The QuickBooks Vendor Id.",
};

export const itemId: Param = {
  key: "itemId",
  label: "Item ID",
  type: "string",
  required: true,
  hint: "The QuickBooks Item Id.",
};

/** QuickBooks' `WHERE`/`ORDERBY` query-endpoint filtering, shared by every list action. */
export const listFilters: Param[] = [
  {
    key: "where",
    label: "Where",
    type: "string",
    advanced: true,
    hint: 'The WHERE clause of QuickBooks\' query syntax, e.g. `Active = true`.',
  },
  {
    key: "orderBy",
    label: "Order by",
    type: "string",
    advanced: true,
    placeholder: "Metadata.LastUpdatedTime DESC",
  },
];

/** QuickBooks' `/query` pagination — 1-based, capped at 1000 results per page. */
export const pagination: Param[] = [
  {
    key: "startPosition",
    label: "Start position",
    type: "number",
    default: 1,
    advanced: true,
    validation: { min: 1, integer: true },
  },
  {
    key: "maxResults",
    label: "Max results",
    type: "number",
    default: 100,
    advanced: true,
    validation: { min: 1, max: 1000, integer: true },
    hint: "QuickBooks caps a single page at 1000.",
  },
];

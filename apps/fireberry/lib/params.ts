import type { Param } from "@w6w/types";

/**
 * The `object` path segment. Fireberry accepts either the object's system name
 * or its number ("either the system name of the object or its number can be
 * placed in the endpoint"), and custom objects have no system name in this list.
 */
export const OBJECT_PARAM: Param = {
  key: "object",
  label: "Object",
  type: "string",
  required: true,
  placeholder: "account",
  hint:
    "System name or object number. Documented names: account, contact, opportunity, task, cases (support tickets), note, product, project, campaign, contracts, article, competitor, businessunit, activity (meetings), calllog (phone calls), crmorder, crmorderitem, accountproduct (assets), activitylog, crmuser, invoice (transactions), invoiceno (invoices), invoicereno, invoicereceipt, invoicecredit, invoicedelivery, invoicedraft, transactionitem. Custom objects: use the number (1000 or above) from Object Studio or Get Objects.",
};

export const PAGESIZE_PARAM: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  hint: "Records per page, 1-50. Fireberry's default is 50.",
  validation: { min: 1, max: 50, integer: true },
};

export const PAGENUMBER_PARAM: Param = {
  key: "pageNumber",
  label: "Page number",
  type: "number",
  hint:
    "1-10. The GET list endpoints stop at page 10 (500 records); use Query Records beyond that.",
  validation: { min: 1, max: 10, integer: true },
};

export const OBJECT_NUMBER_PARAM: Param = {
  key: "objectNumber",
  label: "Object number",
  type: "number",
  required: true,
  hint:
    "The object's number: 1-999 for built-in objects, 1000 and above for custom objects. List them with Get Objects.",
  validation: { min: 1, integer: true },
};

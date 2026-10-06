import type { Param } from "@w6w/types";

export const PRODUCTS = ["regfox.com", "ticketspice.com", "redpodium.com", "givingfuel.com"];

/** `product` is required by every search endpoint and names which Webconnex product to read. */
export const productParam: Param = {
  key: "product",
  label: "Product",
  type: "select",
  required: true,
  default: "regfox.com",
  options: PRODUCTS.map((p) => ({ value: p, label: p })),
  hint: "The Webconnex product whose data to search.",
};

export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "select",
  options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
};

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 50,
  validation: { min: 1, max: 50, integer: true },
  hint: "Results per page, 1 to 50 (the vendor default is 50).",
};

export const startingAfterParam: Param = {
  key: "startingAfter",
  label: "Starting after (cursor)",
  type: "number",
  hint: "Object id to continue after. Pass the previous page's `startingAfter` output.",
};

const dateHint =
  "Accepted formats: 2006-01-02, 01-02-2006, 2006-01-02 15:04, 2006-01-02T15:04:05Z.";

const idParam = (key: string, label: string): Param => ({
  key,
  label,
  type: "number",
  validation: { integer: true },
});
const dateParam = (key: string, label: string): Param => ({
  key,
  label,
  type: "string",
  hint: dateHint,
});

/** Paging, ordering and the id/date filters every search endpoint documents. */
export const commonSearchParams: Param[] = [
  sortParam,
  limitParam,
  startingAfterParam,
  idParam("greaterThanId", "Id greater than"),
  idParam("lessThanId", "Id less than"),
  dateParam("dateCreatedAfter", "Created after"),
  dateParam("dateCreatedBefore", "Created before"),
  dateParam("dateUpdatedAfter", "Updated after"),
  dateParam("dateUpdatedBefore", "Updated before"),
];

export const formIdFilter = idParam("formId", "Form ID");
export const customerIdFilter = idParam("customerId", "Customer ID");
export const orderIdFilter = idParam("orderId", "Order ID");
export const orderDisplayIdFilter: Param = {
  key: "orderDisplayId",
  label: "Order display ID",
  type: "string",
};
export const statusFilter = (hint: string): Param => ({
  key: "status",
  label: "Status",
  type: "string",
  hint,
});
export const orderEmailFilter: Param = { key: "orderEmail", label: "Order email", type: "string" };
export const orderNumberFilter: Param = {
  key: "orderNumber",
  label: "Order number",
  type: "string",
};

export const requiredId = (key: string, label: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
});

/** Optional integer filter. */
export const intParam = idParam;
/** Optional string filter. */
export const strParam = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "string",
  ...(hint ? { hint } : {}),
});
/** Optional timestamp filter. */
export const tsParam = dateParam;

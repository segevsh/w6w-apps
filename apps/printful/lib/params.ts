import type { Param } from "@w6w/types";

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  hint: "Number of items to skip. Use `paging.offset + paging.limit` from the previous page.",
  validation: { min: 0, integer: true },
};

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  hint: "Items per page (Printful caps this at 100).",
  validation: { min: 1, max: 100, integer: true },
};

export const orderIdParam: Param = {
  key: "orderId",
  label: "Order ID",
  type: "string",
  required: true,
  hint: "The numeric order id from List Orders, or `@<external_id>` for your own id.",
};

export const syncProductIdParam: Param = {
  key: "syncProductId",
  label: "Sync product ID",
  type: "string",
  required: true,
  hint: "The numeric sync product id from List Sync Products, or `@<external_id>`.",
};

export const recipientParam: Param = {
  key: "recipient",
  label: "Recipient",
  type: "json",
  required: true,
  hint: 'Address object, e.g. {"name":"Jo","address1":"1 Main St","city":"LA",' +
    '"state_code":"CA","country_code":"US","zip":"90001"}.',
};

export const itemsParam: Param = {
  key: "items",
  label: "Items",
  type: "json",
  required: true,
  hint:
    'Array of line items, e.g. [{"variant_id":4011,"quantity":1,"files":[{"url":"https://…"}]}]; ' +
    "a synced product uses `sync_variant_id` instead of `variant_id`.",
};

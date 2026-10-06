import {
  dateRangeParams,
  idsParam,
  listAction,
  paginationParams,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/receipts` */
export default listAction({
  key: "receipt-list",
  title: "List Receipts",
  description: "List sales and refund receipts, newest first.",
  resource: "receipt",
  path: "/receipts",
  listKey: "receipts",
  paginated: true,
  listQuery: { receiptNumbers: "receipt_numbers" },
  query: {
    sinceReceiptNumber: "since_receipt_number",
    beforeReceiptNumber: "before_receipt_number",
    storeId: "store_id",
    source: "source",
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    limit: "limit",
    cursor: "cursor",
  },
  params: [
    idsParam("receiptNumbers", "Receipt numbers"),
    {
      key: "sinceReceiptNumber",
      label: "Since receipt number",
      type: "string",
      hint: "Receipts created at or after this receipt's created_at.",
    },
    {
      key: "beforeReceiptNumber",
      label: "Before receipt number",
      type: "string",
      hint: "Receipts created up to this receipt's created_at.",
    },
    { key: "storeId", label: "Store id", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Name of the source the receipt came from.",
    },
    ...dateRangeParams,
    ...updatedRangeParams,
    ...paginationParams,
  ],
});

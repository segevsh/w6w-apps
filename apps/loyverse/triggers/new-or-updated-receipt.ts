import { sinceTrigger } from "../lib/since.ts";
import receiptList from "../actions/receipt-list.ts";

/**
 * `GET /v1.0/receipts?updated_at_min=<cursor - overlap>`, following the vendor's `cursor` page
 * token; ids are deduped as `id:updated_at` so an edit of an old receipt is a new event.
 */
export default sinceTrigger({
  key: "new-or-updated-receipt",
  title: "New or Updated Receipt",
  description:
    "The run gets each receipt that was created or changed: its number, totals, line items and timestamps.",
  action: receiptList,
  firstPage: 0,
  request: ({ sinceMs, pageSize, last }) => ({
    updatedAtMin: new Date(sinceMs).toISOString(),
    limit: pageSize,
    cursor: (last as { cursor?: string } | undefined)?.cursor,
  }),
  items: (r) => (r as { receipts?: unknown[] }).receipts ?? [],
  more: (r) => typeof (r as { cursor?: unknown }).cursor === "string",
  idOf: (item) => {
    const r = item as { id?: unknown; updated_at?: unknown };
    return `${String(r.id ?? "")}:${String(r.updated_at ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Receipt ID" },
    { key: "receipt_number", type: "string", label: "Receipt number" },
    { key: "total_money", type: "number", label: "Total" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "f1c1c0de-0000-4000-8000-000000000001",
    receipt_number: "1-1001",
    total_money: 12.5,
    created_at: "2026-11-09T10:00:00.000Z",
    updated_at: "2026-11-09T10:05:00.000Z",
  },
});

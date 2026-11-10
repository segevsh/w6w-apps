import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import receiptList from "../actions/receipt-list.ts";

export default pollFromListAction({
  key: "new-or-updated-receipt",
  title: "New or Updated Receipt",
  description: "The run gets each new or updated receipt.",
  action: receiptList as ActionDefinition,
  input: (_params) => ({ limit: 100 }),
  items: (r) => (r as { receipts?: unknown[] }).receipts ?? [],
  idOf: (item) =>
    String((item as { id?: unknown; updated_at?: unknown }).id ?? "") + ":" +
    String((item as { updated_at?: unknown }).updated_at ?? ""),

  output: [{ key: "id", type: "string", label: "New Receipt ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});

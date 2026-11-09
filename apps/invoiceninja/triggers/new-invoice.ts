import { pollFromListAction } from "../../_shared/poll/mod.ts";
import invoiceGetMany from "../actions/invoice-get-many.ts";

export default pollFromListAction<{ clientId?: string }>({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created invoice for the selected client.",
  action: invoiceGetMany,
  input: (params) => ({
    clientId: params.clientId,
    page: 1,
    perPage: 100,
    sort: "created_at|desc",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "clientId", label: "Client ID", type: "string" }],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "number", type: "string", label: "Invoice number" },
  ],
  sample: { id: "invoice_123", number: "INV-0001" },
});

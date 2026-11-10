import { newestFirstTrigger } from "../lib/triggers.ts";
import invoiceList from "../actions/invoice-list.ts";

export default newestFirstTrigger({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created FreeAgent invoice (newest first).",
  action: invoiceList,
  itemsKey: "invoices",
  sort: "-created_at",
  paged: true,
  output: [
    { key: "url", type: "string", label: "Invoice URL (its ID)" },
    { key: "contact", type: "string", label: "Contact URL" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "dated_on", type: "string", label: "Invoice date" },
    { key: "total_value", type: "string", label: "Total" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/invoices/1",
    contact: "https://api.freeagent.com/v2/contacts/2",
    reference: "001",
    dated_on: "2026-11-09",
    total_value: "200.0",
    status: "Open",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});

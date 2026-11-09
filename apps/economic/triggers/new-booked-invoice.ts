import { pollFromListAction } from "../../_shared/poll/mod.ts";
import invoiceBookedList from "../actions/invoice-booked-list.ts";

export default pollFromListAction({
  key: "new-booked-invoice",
  title: "New Booked Invoice",
  description: "The run gets each newly booked invoice.",
  action: invoiceBookedList,
  input: () => ({ pageSize: 100, skipPages: 0, sort: "-bookedInvoiceNumber" }),
  items: (result) =>
    Array.isArray((result as { items?: unknown[] }).items)
      ? (result as { items: unknown[] }).items
      : [],
  idOf: (item) =>
    String(
      (item as { bookedInvoiceNumber?: unknown; id?: unknown }).bookedInvoiceNumber ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "bookedInvoiceNumber", type: "number", label: "Booked invoice number" }],
  sample: { bookedInvoiceNumber: 101 },
  maxPages: 1,
});

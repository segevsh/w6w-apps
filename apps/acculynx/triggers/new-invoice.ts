import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import jobInvoicesList from "../actions/job-invoices-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each new invoice for the AccuLynx job you choose.",
  action: jobInvoicesList as unknown as ActionDefinition,
  input: (params: { jobId?: string }) => ({
    jobId: params.jobId,
    pageSize: 100,
    sortOrder: "Descending",
  }),
  params: [jobInvoicesList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-101", status: "Open" },
});

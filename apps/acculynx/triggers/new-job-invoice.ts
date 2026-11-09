import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-invoices-list.ts";

export default pollFromListAction({
  key: "new-job-invoice",
  title: "New Job Invoice",
  description: "The run gets each newly created job invoice.",
  action: action as never,
  params: action.params,
  input: (params) => ({ ...params as Record<string, unknown>, sortOrder: "Descending" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-101" },
  maxPages: 1,
});

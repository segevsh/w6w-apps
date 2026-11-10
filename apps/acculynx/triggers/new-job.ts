import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-list.ts";

const trigger = pollFromListAction({
  key: "new-job",
  title: "New Job",
  description: "Emits jobs in the API's documented newest-created-first order.",
  action,
  input: () => ({ pageSize: 100, sortBy: "CreatedDate", sortOrder: "Descending" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: "job-101" },
});

export default trigger;

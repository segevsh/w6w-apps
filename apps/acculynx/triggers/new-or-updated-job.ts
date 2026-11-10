import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-list.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-job",
  title: "New or Updated Job",
  description: "Emits jobs in the API's documented newest-modified-first order.",
  action,
  input: () => ({ pageSize: 100, sortBy: "ModifiedDate", sortOrder: "Descending" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const job = item as { id?: unknown; modifiedDate?: unknown; ModifiedDate?: unknown };
    return `${String(job.id ?? "")}:${String(job.modifiedDate ?? job.ModifiedDate ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: "job-101" },
});

export default trigger;

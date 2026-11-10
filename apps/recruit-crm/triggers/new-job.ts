import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/job-list.ts";

export default pollFromListAction({
  key: "new-job",
  title: "New Job",
  description: "The run gets each newly created job.",
  action,
  input: () => ({ sortBy: "created_at", sortOrder: "desc", limit: 100, page: 1 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: 1, title: "Engineer" },
  maxPages: 1,
});

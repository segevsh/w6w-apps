import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/candidate-list.ts";

export default pollFromListAction({
  key: "new-candidate",
  title: "New Candidate",
  description: "Polls the existing candidate-list action ordered by Created_Time descending.",
  action,
  input: () => ({ page: 1, per_page: 100, sort_by: "Created_Time", sort_order: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Candidate ID" }],
  sample: { id: "candidate-101" },
});

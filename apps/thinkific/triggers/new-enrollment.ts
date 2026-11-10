import { pollFromListAction } from "../../_shared/poll/mod.ts";
import enrollmentsList from "../actions/enrollments-list.ts";

export default pollFromListAction({
  key: "new-enrollment",
  title: "New Enrollment",
  description: "The run gets each newly created enrollment.",
  action: enrollmentsList,
  input: () => ({ page: 1, limit: 250 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Enrollment ID" }],
  sample: { id: 101, created_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});

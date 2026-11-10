import { pollFromListAction } from "../../_shared/poll/mod.ts";
import enrollmentsList from "../actions/enrollments-list.ts";

export default pollFromListAction({
  key: "new-or-updated-enrollment",
  title: "New or Updated Enrollment",
  description: "The run gets each newly created or updated enrollment.",
  action: enrollmentsList,
  input: () => ({ page: 1, limit: 250 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const row = item as { id?: unknown; updated_at?: unknown; updatedAt?: unknown };
    return `${String(row.id ?? "")}:${String(row.updated_at ?? row.updatedAt ?? "")}`;
  },
  output: [{ key: "id", type: "number", label: "Enrollment ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});

import workHistoryList from "../actions/work-history-list.ts";
import { requireId, snapshotTrigger } from "../lib/triggers.ts";
import { employeeIdParam } from "../lib/params.ts";

/** Employee work table, GET /people/{id}/work: every row carries an `id`; the table is bounded per employee. */
export default snapshotTrigger({
  key: "new-work-history-entry",
  title: "New Work History Entry",
  description:
    "The run gets each work-table entry (title, department, manager, site change) added for the chosen employee.",
  action: workHistoryList,
  params: [employeeIdParam],
  input: (p) => ({ employeeId: requireId(p.employeeId, "employeeId") }),
  items: (result) => (result as { values?: unknown[] })?.values ?? [],
  idOf: (item) => String((item as { id?: unknown })?.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Entry ID" },
    { key: "effectiveDate", type: "string", label: "Effective date" },
    { key: "department", type: "string", label: "Department" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { id: 1, effectiveDate: "2026-11-01", title: "Engineer", department: "Platform" },
});

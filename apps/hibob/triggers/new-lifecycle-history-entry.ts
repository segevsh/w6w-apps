import lifecycleHistoryList from "../actions/lifecycle-history-list.ts";
import { requireId, snapshotTrigger } from "../lib/triggers.ts";
import { employeeIdParam } from "../lib/params.ts";

/** Employee lifecycle table, GET /people/{id}/lifecycle: every row carries an `id`; the table is bounded per employee. */
export default snapshotTrigger({
  key: "new-lifecycle-history-entry",
  title: "New Lifecycle History Entry",
  description:
    "The run gets each lifecycle-table entry (hired, on leave, terminated) added for the chosen employee.",
  action: lifecycleHistoryList,
  params: [employeeIdParam],
  input: (p) => ({ employeeId: requireId(p.employeeId, "employeeId") }),
  items: (result) => (result as { values?: unknown[] })?.values ?? [],
  idOf: (item) => String((item as { id?: unknown })?.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Entry ID" },
    { key: "effectiveDate", type: "string", label: "Effective date" },
    { key: "status", type: "string", label: "Status" },
    { key: "employeeStatus", type: "string", label: "Employee status" },
  ],
  sample: { id: 3, effectiveDate: "2026-11-01", status: "Hired", employeeStatus: "Employed" },
});

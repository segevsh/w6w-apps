import employmentHistoryList from "../actions/employment-history-list.ts";
import { requireId, snapshotTrigger } from "../lib/triggers.ts";
import { employeeIdParam } from "../lib/params.ts";

/** Employee employment table, GET /people/{id}/employment: every row carries an `id`; the table is bounded per employee. */
export default snapshotTrigger({
  key: "new-employment-history-entry",
  title: "New Employment History Entry",
  description: "The run gets each employment-table entry added for the chosen employee.",
  action: employmentHistoryList,
  params: [employeeIdParam],
  input: (p) => ({ employeeId: requireId(p.employeeId, "employeeId") }),
  items: (result) => (result as { values?: unknown[] })?.values ?? [],
  idOf: (item) => String((item as { id?: unknown })?.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Entry ID" },
    { key: "effectiveDate", type: "string", label: "Effective date" },
    { key: "contract", type: "string", label: "Contract" },
  ],
  sample: { id: 2, effectiveDate: "2026-11-01", contract: "Full time" },
});

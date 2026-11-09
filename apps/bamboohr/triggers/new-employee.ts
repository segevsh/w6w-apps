import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listEmployees from "../actions/list-employees.ts";

export default pollFromListAction({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each newly added employee.",
  action: listEmployees,
  input: () => ({ sort: "-employeeId", limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; employeeId?: unknown }).id ??
        (item as { employeeId?: unknown }).employeeId ?? "",
    ),
  output: [{ key: "id", type: "string", label: "Employee ID" }],
  sample: { id: "101" },
  maxPages: 1,
});

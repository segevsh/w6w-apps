import { pollFromListAction } from "../../_shared/poll/mod.ts";
import employeeSearch from "../actions/employee-search.ts";

export default pollFromListAction({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each newly created employee.",
  action: employeeSearch,
  input: () => ({ sort: { Id: "desc" }, max: 100, cursor: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String((item as { Id?: unknown; id?: unknown }).Id ?? (item as { id?: unknown }).id ?? ""),
  output: [{ key: "Id", type: "number", label: "Employee ID" }],
  sample: { Id: 1 },
  maxPages: 1,
});

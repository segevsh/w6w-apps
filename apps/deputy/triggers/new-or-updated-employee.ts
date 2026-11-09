import { pollFromListAction } from "../../_shared/poll/mod.ts";
import employeeSearch from "../actions/employee-search.ts";
import { employeeItems, employeeOutput, employeeSample } from "./new-employee.ts";

export default pollFromListAction({
  key: "new-or-updated-employee",
  title: "New or Updated Employee",
  description: "The run gets each employee that was created or edited since the last check.",
  action: employeeSearch,
  input: () => ({ sort: { Modified: "desc" }, max: 100, cursor: 0 }),
  items: employeeItems,
  idOf: (item) => {
    const e = item as { Id?: unknown; Modified?: unknown };
    return `${e.Id ?? ""}:${e.Modified ?? ""}`;
  },
  output: employeeOutput,
  sample: employeeSample,
  maxPages: 1,
});

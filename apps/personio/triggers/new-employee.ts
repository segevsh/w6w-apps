import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-employees.ts";

export default pollFromListAction({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each newly created employee.",
  action,
  input: () => ({ limit: 100, offset: 0 }),
  items: (r) => (r as { employees?: unknown[] }).employees ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Employee ID" }],
  sample: { id: "employee-2" },
  maxPages: 1,
});

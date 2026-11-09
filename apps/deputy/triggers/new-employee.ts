import { pollFromListAction } from "../../_shared/poll/mod.ts";
import employeeSearch from "../actions/employee-search.ts";

export const employeeOutput = [
  { key: "Id", type: "number" as const, label: "Employee ID" },
  { key: "DisplayName", type: "string" as const, label: "Display name" },
  { key: "Company", type: "number" as const, label: "Business ID" },
  { key: "Created", type: "string" as const, label: "Created at" },
  { key: "Modified", type: "string" as const, label: "Modified at" },
];

export const employeeSample = {
  Id: 42,
  DisplayName: "Sam Rivera",
  Company: 1,
  Created: "2026-11-09T09:00:00+00:00",
  Modified: "2026-11-09T09:00:00+00:00",
};

export const employeeItems = (result: unknown) => (result as { items?: unknown[] }).items ?? [];

export default pollFromListAction({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each newly created employee.",
  action: employeeSearch,
  input: () => ({ sort: { Id: "desc" }, max: 100, cursor: 0 }),
  items: employeeItems,
  idOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: employeeOutput,
  sample: employeeSample,
  maxPages: 1,
});

import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import employeeList from "../actions/employee-list.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each new employee added to the agency.",
  action: employeeList as unknown as ActionDefinition,
  input: () => ({}),
  pick: (result) => arrayAt(result, "employees"),
  idOf: idField("id"),
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "isProducer", type: "boolean", label: "Is a producer" },
  ],
  sample: {
    id: 31,
    firstname: "Sam",
    lastname: "Rivera",
    email: "sam@example.com",
    isProducer: true,
  },
});

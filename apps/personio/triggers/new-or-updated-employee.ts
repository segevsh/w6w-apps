import type { ActionDefinition } from "@w6w/types";
import listEmployees from "../actions/list-employees.ts";
import { type Employee, employeesSince, sinceFilterTrigger } from "../lib/triggers.ts";

// `updated_since` is documented on GET /company/employees; the id carries `last_modified_at`
// so an edit is a new event (brief 9.2).
export default sinceFilterTrigger<Employee, Record<string, never>>({
  key: "new-or-updated-employee",
  title: "New or Updated Employee",
  description: "The run gets each employee that was created or updated.",
  load: employeesSince(listEmployees as unknown as ActionDefinition),
  idOf: (e) => `${e.id ?? ""}:${e.last_modified_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "last_modified_at", type: "string", label: "Last modified at" },
  ],
  sample: {
    id: 2,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    last_modified_at: "2026-11-10T09:30:00+00:00",
  },
});

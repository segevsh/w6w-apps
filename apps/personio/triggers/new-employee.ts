import type { ActionDefinition } from "@w6w/types";
import listEmployees from "../actions/list-employees.ts";
import { type Employee, employeesSince, sinceFilterTrigger } from "../lib/triggers.ts";

// Personio documents `updated_since` on GET /company/employees (no sort order), so this is a
// since-filter poll (brief 9.1b); the created_at test keeps edited old employees out.
export default sinceFilterTrigger<Employee, Record<string, never>>({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each newly created employee.",
  load: employeesSince(listEmployees as unknown as ActionDefinition),
  idOf: (e) => String(e.id ?? ""),
  keep: (e, from) =>
    typeof e.created_at === "string" && Date.parse(e.created_at) >= Date.parse(from),
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 2,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    created_at: "2026-11-10T09:00:00+00:00",
  },
});

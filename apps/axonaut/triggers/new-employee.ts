import { snapshotTrigger } from "../lib/snapshot.ts";
import employeeList from "../actions/employee-list.ts";

/**
 * `GET /api/v2/employees` (https://axonaut.com/api/v2/doc, 2026-11-10) is served unordered and unfiltered, one page per `page`
 * header with no total, so each check reads every page and diffs the ids against the previous check (added only).
 */
export default snapshotTrigger({
  key: "new-employee",
  title: "New Contact Person",
  description:
    "The run gets each employee (a contact person of a company) newly created in Axonaut.",
  action: employeeList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "company_id", type: "number", label: "Company ID" },
  ],
  sample: {
    id: 2201,
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
    company_id: 1042,
  },
});

import employeeList from "../actions/employee-list.ts";
import { snapshotTrigger } from "../lib/record-triggers.ts";

/**
 * Snapshot poll (brief 9.1 c). A tenant's employees are a small configuration list; the whole list is read
 * page by page through `employee-list` and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-employee",
  title: "New Employee",
  description: "The run gets each employee newly added to the ServiceTitan tenant.",
  action: employeeList,
  output: [
    { key: "id", type: "number", label: "Employee ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],
  sample: { id: 301, name: "Grace Hopper", email: "grace@example.com", role: "Admin" },
});

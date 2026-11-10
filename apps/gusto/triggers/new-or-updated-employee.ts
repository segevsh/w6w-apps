import { asArray, COMPANY_PARAM, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import employeeList from "../actions/employee-list.ts";

export default snapshotTrigger({
  key: "new-or-updated-employee",
  title: "New or Updated Employee",
  description:
    "The run gets each employee that is new or whose record changed since the last check.",
  action: employeeList,
  params: [COMPANY_PARAM],
  input: (p) => ({ companyId: p.companyId, returnAll: true }),
  items: asArray,
  idOf: uuidOf,
  updated: true,
  output: [
    { key: "uuid", type: "string", label: "Employee UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "terminated", type: "boolean", label: "Terminated" },
    { key: "version", type: "string", label: "Version" },
  ],
  sample: {
    uuid: "employee-1",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    terminated: false,
    version: "v1",
  },
});

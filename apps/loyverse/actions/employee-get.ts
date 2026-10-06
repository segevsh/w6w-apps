import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/employees/{employee_id}` */
export default getAction({
  key: "employee-get",
  title: "Get Employee",
  description: "Get one employee by id.",
  resource: "employee",
  path: "/employees/{id}",
  idKey: "employeeId",
  idLabel: "Employee id",
});

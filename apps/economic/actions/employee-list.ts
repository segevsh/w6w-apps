import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "employee-list",
  resource: "employee",
  title: "List Employees",
  description: "List employees (sales persons).",
  path: "/employees",
});

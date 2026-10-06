import {
  dateRangeParams,
  idsParam,
  listAction,
  paginationParams,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/employees` */
export default listAction({
  key: "employee-list",
  title: "List Employees",
  description: "List the account's employees.",
  resource: "employee",
  path: "/employees",
  listKey: "employees",
  paginated: true,
  listQuery: { employeeIds: "employee_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
    limit: "limit",
    cursor: "cursor",
  },
  params: [
    idsParam("employeeIds", "Employee ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
    ...paginationParams,
  ],
});

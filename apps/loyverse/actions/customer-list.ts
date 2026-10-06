import {
  dateRangeParams,
  idsParam,
  listAction,
  paginationParams,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/customers` — customers are hard-deleted, so there is no show_deleted. */
export default listAction({
  key: "customer-list",
  title: "List Customers",
  description: "List customers, newest first.",
  resource: "customer",
  path: "/customers",
  listKey: "customers",
  paginated: true,
  listQuery: { customerIds: "customer_ids" },
  query: {
    email: "email",
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    limit: "limit",
    cursor: "cursor",
  },
  params: [
    idsParam("customerIds", "Customer ids"),
    { key: "email", label: "Email", type: "string", hint: "Only customers with this email." },
    ...dateRangeParams,
    ...updatedRangeParams,
    ...paginationParams,
  ],
});

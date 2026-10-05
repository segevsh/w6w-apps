import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "leave-balance-list",
  resource: "leave-balance",
  title: "List Leave Balances",
  description: "Per-worker time-off balances by leave type. Returns one page, forward-paginated.",
  path: "/leave-balances/",
  scope: "leave-balances.read",
  filterable: ["worker_id", "leave_type_id"],
  expandable: ["worker", "leave_type"],
  sortable: ["id", "created_at", "updated_at"],
});

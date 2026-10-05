import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "leave-balance-get",
  resource: "leave-balance",
  title: "Get Leave Balance",
  description: "Retrieve one leave balance by id.",
  path: "/leave-balances",
  scope: "leave-balances.read",
  expandable: ["worker", "leave_type"],
});

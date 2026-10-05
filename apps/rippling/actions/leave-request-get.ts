import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "leave-request-get",
  resource: "leave-request",
  title: "Get Leave Request",
  description: "Retrieve one leave request by id.",
  path: "/leave-requests",
  scope: "leave-requests.read",
  expandable: ["worker", "requester", "leave_type", "reviewer"],
});

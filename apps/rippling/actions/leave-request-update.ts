import { updateAction } from "../lib/actions.ts";
import { leaveFields } from "../lib/leave-request.ts";

export default updateAction({
  key: "leave-request-update",
  resource: "leave-request",
  title: "Update Leave Request",
  description:
    "Update a time-off request: approve or reject it by setting the status, or change its dates and notes.",
  path: "/leave-requests",
  scope: "leave-requests.read-write",
  fields: leaveFields(false),
});

import { createAction } from "../lib/actions.ts";
import { leaveFields } from "../lib/leave-request.ts";

const base = createAction({
  key: "leave-request-create",
  resource: "leave-request",
  title: "Create Leave Request",
  description:
    "Create a time-off request for a worker. A leave type or a leave policy must be given.",
  path: "/leave-requests",
  scope: "leave-requests.read-write",
  fields: leaveFields(true),
});

export default {
  ...base,
  execute(input: Record<string, unknown>, ctx: Parameters<typeof base.execute>[1]) {
    if (!input.leaveTypeId && !input.leavePolicyId) {
      throw new Error("leaveTypeId or leavePolicyId is required");
    }
    return base.execute(input, ctx);
  },
} satisfies typeof base;

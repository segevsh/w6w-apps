import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam } from "../lib/params.ts";

interface Input {
  employeeId: string;
  requestId: number | string;
}

/** `DELETE /v1/timeoff/employees/{id}/requests/{requestId}` — cancels (not hard-deletes) a request. */
const timeoffRequestCancel: ActionDefinition<Input> = {
  key: "timeoff-request-cancel",
  type: "perform",
  idempotent: true,
  resource: "timeoff",
  title: "Cancel Time Off Request",
  description: "Cancel an existing time off request.",
  params: [employeeIdParam, {
    key: "requestId",
    label: "Request ID",
    type: "number",
    required: true,
  }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).ack(
      "DELETE",
      `/timeoff/employees/${encodeId(input.employeeId)}/requests/${encodeId(input.requestId)}`,
    );
  },
};

export default timeoffRequestCancel;

import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam } from "../lib/params.ts";

interface Input {
  employeeId: string;
  requestId: number | string;
  includeDailyDurations?: boolean;
}

/** `GET /v1/timeoff/employees/{id}/requests/{requestId}` — one request; its shape varies with `type`. */
const timeoffRequestGet: ActionDefinition<Input> = {
  key: "timeoff-request-get",
  type: "read",
  resource: "timeoff",
  title: "Get Time Off Request",
  description: "Read one time off request, optionally with per-day durations.",
  params: [
    employeeIdParam,
    { key: "requestId", label: "Request ID", type: "number", required: true },
    {
      key: "includeDailyDurations",
      label: "Include daily durations",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "requestId", type: "number", label: "Request ID" },
    { key: "status", type: "string", label: "Request status" },
    { key: "type", type: "string", label: "days | hours | ..." },
  ],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get(
      `/timeoff/employees/${encodeId(input.employeeId)}/requests/${encodeId(input.requestId)}`,
      { includeDailyDurations: input.includeDailyDurations ? true : undefined },
    );
  },
};

export default timeoffRequestGet;

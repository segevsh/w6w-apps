import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, encodeSegment, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, callLogViewOptions, extensionIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/call-log/{callRecordId}`
 * — one call log record by ID. Needs `ReadCallLog` (app + user).
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  callRecordId: string;
  view?: string;
}

const callLogGet: ActionDefinition<Input> = {
  key: "call-log-get",
  type: "read",
  resource: "call-log",
  title: "Get Call Log Record",
  description: "Fetch one call log record by ID.",
  params: [
    accountIdParam,
    extensionIdParam,
    { key: "callRecordId", label: "Call record ID", type: "string", required: true },
    { key: "view", label: "View", type: "select", options: callLogViewOptions, default: "Simple" },
  ],
  output: [
    { key: "id", type: "string", label: "Call record ID" },
    { key: "type", type: "string", label: "Voice or Fax" },
    { key: "direction", type: "string", label: "Inbound or Outbound" },
    { key: "action", type: "string", label: "Call action (Phone Call, Fax, RingOut, …)" },
    { key: "result", type: "string", label: "Call result" },
    { key: "from", type: "object", label: "Caller" },
    { key: "to", type: "object", label: "Callee" },
    { key: "startTime", type: "string", label: "Start time (ISO 8601)" },
    { key: "duration", type: "number", label: "Duration (seconds)" },
    { key: "recording", type: "object", label: "Recording info, if any" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/call-log/${encodeSegment(input.callRecordId)}`,
      { query: { view: input.view } },
    );
  },
};

export default callLogGet;

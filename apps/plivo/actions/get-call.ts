import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  callUuid: string;
}

/**
 * `GET /v1/Account/{auth_id}/Call/{call_uuid}/` — the call detail record. Only
 * calls from the last 90 days can be retrieved.
 */
const getCall: ActionDefinition<Input> = {
  key: "get-call",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Retrieve the call detail record (duration, billing, hangup cause) of one call.",
  params: [
    {
      key: "callUuid",
      label: "Call UUID",
      type: "string",
      required: true,
      hint: "Calls from the last 90 days can be retrieved.",
    },
  ],

  output: [
    { key: "call_uuid", type: "string", label: "Call UUID" },
    { key: "call_direction", type: "string", label: "Direction" },
    { key: "from_number", type: "string", label: "From" },
    { key: "to_number", type: "string", label: "To" },
    { key: "call_state", type: "string", label: "State" },
    { key: "call_duration", type: "number", label: "Duration (s)" },
    { key: "bill_duration", type: "number", label: "Billed duration (s)" },
    { key: "total_amount", type: "string", label: "Total amount (USD)" },
    { key: "hangup_cause_name", type: "string", label: "Hangup cause" },
    { key: "hangup_cause_code", type: "number", label: "Hangup cause code" },
    { key: "initiation_time", type: "string", label: "Initiation time" },
    { key: "end_time", type: "string", label: "End time" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Call/${segment("callUuid", input.callUuid)}/`);
  },
};

export default getCall;

import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  callUuid: string;
}

/**
 * `DELETE /v1/Account/{auth_id}/Call/{call_uuid}/` → 204.
 *
 * Plivo documents that omitting the UUID hangs up EVERY ongoing call on the
 * account. `segment()` makes the UUID mandatory here so an empty workflow
 * variable can never turn into that.
 */
const hangupCall: ActionDefinition<Input> = {
  key: "hangup-call",
  type: "perform",
  resource: "call",
  title: "Hang Up Call",
  description: "Hang up one ongoing call, or cancel a queued outbound call.",
  idempotent: true,
  params: [{ key: "callUuid", label: "Call UUID", type: "string", required: true }],

  output: [
    { key: "hungUp", type: "boolean", label: "Whether the hang-up was accepted" },
    { key: "callUuid", type: "string", label: "Call UUID" },
  ],

  async execute(input, ctx) {
    const callUuid = input.callUuid;
    await new PlivoClient(ctx).request(`Call/${segment("callUuid", callUuid)}/`, {
      method: "DELETE",
    });
    return { hungUp: true, callUuid: callUuid.trim() };
  },
};

export default hangupCall;

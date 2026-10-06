import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  requestUuid: string;
}

/**
 * `DELETE /v1/Account/{auth_id}/Request/{request_uuid}/` → 204. Cancels an API
 * request that has not been answered yet — the `request_uuid` that `make-call`
 * returns (`call fired`), which exists before there is a `call_uuid`.
 */
const cancelCallRequest: ActionDefinition<Input> = {
  key: "cancel-call-request",
  type: "perform",
  resource: "call",
  title: "Cancel Call Request",
  description: "Cancel a pending outbound call using the request UUID that Make Call returned.",
  idempotent: true,
  params: [
    {
      key: "requestUuid",
      label: "Request UUID",
      type: "string",
      required: true,
      hint: "The `request_uuid` from Make Call.",
    },
  ],

  output: [
    { key: "cancelled", type: "boolean", label: "Whether the cancellation was accepted" },
    { key: "requestUuid", type: "string", label: "Request UUID" },
  ],

  async execute(input, ctx) {
    await new PlivoClient(ctx).request(`Request/${segment("requestUuid", input.requestUuid)}/`, {
      method: "DELETE",
    });
    return { cancelled: true, requestUuid: input.requestUuid.trim() };
  },
};

export default cancelCallRequest;

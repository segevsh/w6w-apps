import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, extensionIdParam, phoneNumberParam } from "../lib/params.ts";

/**
 * `POST /restapi/v1.0/account/{accountId}/extension/{extensionId}/ring-out` —
 * a 2-legged RingOut call: RingCentral calls `from` first, and once answered,
 * bridges it to `to`. Needs the `RingOut` app permission.
 *
 * No idempotency key of any kind is documented on this endpoint — retrying
 * places a second call. Poll the returned `id` with `ring-out-get` for status.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  from: string;
  to: string;
  callerId?: string;
  playPrompt?: boolean;
}

const ringOutCreate: ActionDefinition<Input> = {
  key: "ring-out-create",
  type: "perform",
  resource: "ring-out",
  title: "Make RingOut Call",
  description: "Place a 2-legged RingOut call: ring `from`, then bridge to `to` once answered.",
  idempotent: false,
  params: [
    accountIdParam,
    extensionIdParam,
    phoneNumberParam("from", "From (rings this number first)", true),
    phoneNumberParam("to", "To (bridged in once From answers)", true),
    phoneNumberParam("callerId", "Caller ID shown to To"),
    {
      key: "playPrompt",
      label: "Play confirmation prompt",
      type: "boolean",
      hint: "Audio prompt the From party hears once connected, before being bridged to To.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "RingOut call ID — pass to ring-out-get to poll status" },
    { key: "uri", type: "string", label: "Resource URI" },
    { key: "status", type: "object", label: "callStatus / callerStatus" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/ring-out`,
      {
        method: "POST",
        body: {
          from: { phoneNumber: input.from },
          to: { phoneNumber: input.to },
          callerId: input.callerId ? { phoneNumber: input.callerId } : undefined,
          playPrompt: input.playPrompt,
        },
      },
    );
  },
};

export default ringOutCreate;

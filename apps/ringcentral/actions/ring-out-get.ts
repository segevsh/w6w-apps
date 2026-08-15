import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, encodeSegment, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, extensionIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/ring-out/{ringoutId}`
 * — the status of a RingOut call started with `ring-out-create`. Needs the
 * `RingOut` app permission.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  ringoutId: string;
}

const ringOutGet: ActionDefinition<Input> = {
  key: "ring-out-get",
  type: "read",
  resource: "ring-out",
  title: "Get RingOut Call Status",
  description: "Poll the status of a RingOut call by ID.",
  params: [
    accountIdParam,
    extensionIdParam,
    { key: "ringoutId", label: "RingOut call ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "RingOut call ID" },
    {
      key: "status",
      type: "object",
      label: "callStatus (Success/InProgress/Busy/NoAnswer/Rejected/Finished/…) / callerStatus",
    },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/ring-out/${encodeSegment(input.ringoutId)}`,
    );
  },
};

export default ringOutGet;

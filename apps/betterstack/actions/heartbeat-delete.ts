import type { ActionDefinition } from "@w6w/types";
import { encodeId, removeResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `DELETE /api/v2/heartbeats/{heartbeat_id}` (Better Stack Uptime API v2).
 */
type Input = {
  heartbeat_id: string;
};

const heartbeatDelete: ActionDefinition<Input> = {
  key: "heartbeat-delete",
  type: "perform",
  resource: "heartbeat",
  title: "Delete Heartbeat",
  description: "Permanently delete a heartbeat.",
  idempotent: true,
  params: [
    str("heartbeat_id", "Heartbeat ID", { required: true, hint: "The heartbeat to delete." }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "true once the vendor answered 204" },
    { key: "id", type: "string", label: "The deleted heartbeat's ID" },
  ],

  execute(input, ctx) {
    return removeResource(
      ctx,
      `${V2}/heartbeats/${encodeId(input.heartbeat_id)}`,
      String(input.heartbeat_id),
    );
  },
};

export default heartbeatDelete;

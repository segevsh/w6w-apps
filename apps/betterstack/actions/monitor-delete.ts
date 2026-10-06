import type { ActionDefinition } from "@w6w/types";
import { encodeId, removeResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `DELETE /api/v2/monitors/{monitor_id}` (Better Stack Uptime API v2).
 */
type Input = {
  monitor_id: string;
};

const monitorDelete: ActionDefinition<Input> = {
  key: "monitor-delete",
  type: "perform",
  resource: "monitor",
  title: "Delete Monitor",
  description: "Permanently delete a monitor.",
  idempotent: true,
  params: [
    str("monitor_id", "Monitor ID", { required: true, hint: "The monitor to delete." }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "true once the vendor answered 204" },
    { key: "id", type: "string", label: "The deleted monitor's ID" },
  ],

  execute(input, ctx) {
    return removeResource(
      ctx,
      `${V2}/monitors/${encodeId(input.monitor_id)}`,
      String(input.monitor_id),
    );
  },
};

export default monitorDelete;

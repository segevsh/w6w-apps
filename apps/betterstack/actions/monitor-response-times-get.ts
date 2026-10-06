import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/monitors/{monitor_id}/response-times` (Better Stack Uptime API v2).
 */
type Input = {
  monitor_id: string;
};

const monitorResponseTimesGet: ActionDefinition<Input> = {
  key: "monitor-response-times-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor Response Times",
  description: "Recent response-time samples for a monitor, grouped by check region.",
  params: [
    str("monitor_id", "Monitor ID", { required: true, hint: "The monitor." }),
  ],
  output: [
    {
      key: "regions",
      type: "array",
      label:
        "Per region: {region, response_times: [{at, response_time, name_lookup_time, connection_time, tls_handshake_time, data_transfer_time}]}",
    },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "GET", `${V2}/monitors/${encodeId(input.monitor_id)}/response-times`);
  },
};

export default monitorResponseTimesGet;

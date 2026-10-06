import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, scrubMonitor, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/monitors/{monitor_id}` (Better Stack Uptime API v2).
 */
type Input = {
  monitor_id: string;
};

const monitorGet: ActionDefinition<Input> = {
  key: "monitor-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor",
  description:
    "Fetch one monitor, including its current up/down status. Secrets a user may have typed into it (proxy credentials, environment variables, sensitive request headers) are redacted.",
  params: [
    str("monitor_id", "Monitor ID", { required: true, hint: "The monitor's numeric ID." }),
  ],
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "pronounceable_name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    {
      key: "status",
      type: "string",
      label: "up, down, paused, pending, maintenance or validating",
    },
    { key: "last_checked_at", type: "string", label: "Last check time" },
  ],

  execute(input, ctx) {
    return oneResource(
      ctx,
      "GET",
      `${V2}/monitors/${encodeId(input.monitor_id)}`,
      {},
      scrubMonitor,
    );
  },
};

export default monitorGet;

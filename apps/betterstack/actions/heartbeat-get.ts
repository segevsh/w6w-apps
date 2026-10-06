import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/heartbeats/{heartbeat_id}` (Better Stack Uptime API v2).
 */
type Input = {
  heartbeat_id: string;
};

const heartbeatGet: ActionDefinition<Input> = {
  key: "heartbeat-get",
  type: "read",
  resource: "heartbeat",
  title: "Get Heartbeat",
  description: "Fetch one heartbeat, including the ping URL your job must call.",
  params: [
    str("heartbeat_id", "Heartbeat ID", { required: true, hint: "The heartbeat's numeric ID." }),
  ],
  output: [
    { key: "id", type: "string", label: "Heartbeat ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "Ping URL: calling it records a beat" },
    { key: "period", type: "number", label: "Expected period, seconds" },
    { key: "grace", type: "number", label: "Grace, seconds" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "GET", `${V2}/heartbeats/${encodeId(input.heartbeat_id)}`);
  },
};

export default heartbeatGet;

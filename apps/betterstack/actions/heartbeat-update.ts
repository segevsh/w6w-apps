import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { heartbeatBody, heartbeatFields, str } from "../lib/params.ts";

/**
 * `PATCH /api/v2/heartbeats/{heartbeat_id}` (Better Stack Uptime API v2).
 */
type Input = {
  heartbeat_id: string;
  name?: string;
  period?: number;
  grace?: number;
  call?: boolean;
  sms?: boolean;
  email?: boolean;
  push?: boolean;
  critical_alert?: boolean;
  team_wait?: number;
  heartbeat_group_id?: string;
  sort_index?: number;
  paused?: boolean;
  server_timezone?: string;
  policy_id?: string;
  maintenance_days?: string[];
  maintenance_from?: string;
  maintenance_to?: string;
  maintenance_timezone?: string;
};

const heartbeatUpdate: ActionDefinition<Input> = {
  key: "heartbeat-update",
  type: "perform",
  resource: "heartbeat",
  title: "Update Heartbeat",
  description:
    "Change a heartbeat's schedule or alerting, or pause/resume it. Only the fields you set are sent.",
  idempotent: true,
  params: [
    str("heartbeat_id", "Heartbeat ID", { required: true, hint: "The heartbeat to change." }),
    str("name", "Name"),
    ...heartbeatFields(),
  ],
  output: [
    { key: "id", type: "string", label: "Heartbeat ID" },
    { key: "status", type: "string", label: "Status after the change" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "PATCH", `${V2}/heartbeats/${encodeId(input.heartbeat_id)}`, {
      body: heartbeatBody(input),
    });
  },
};

export default heartbeatUpdate;

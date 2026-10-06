import type { ActionDefinition } from "@w6w/types";
import { oneResource, pick, V2 } from "../lib/client.ts";
import { heartbeatBody, heartbeatFields, str } from "../lib/params.ts";

/**
 * `POST /api/v2/heartbeats` (Better Stack Uptime API v2).
 */
type Input = {
  team_name?: string;
  name: string;
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

const heartbeatCreate: ActionDefinition<Input> = {
  key: "heartbeat-create",
  type: "perform",
  resource: "heartbeat",
  title: "Create Heartbeat",
  description: "Create a heartbeat. The result includes the ping URL for the job to call.",
  idempotent: false,
  params: [
    str("team_name", "Team name", {
      hint: "Required with a global API token: the team that will own the heartbeat.",
    }),
    str("name", "Name", { required: true, hint: "The service this heartbeat watches." }),
    ...heartbeatFields(),
  ],
  output: [
    { key: "id", type: "string", label: "New heartbeat ID" },
    { key: "url", type: "string", label: "Ping URL" },
    { key: "status", type: "string", label: "Initial status" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "POST", `${V2}/heartbeats`, {
      body: { ...pick(input, ["team_name"]), ...heartbeatBody(input) },
    });
  },
};

export default heartbeatCreate;

import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, scrubMonitor, V2 } from "../lib/client.ts";
import { monitorBody, monitorFields, monitorTypeOptions, select, str } from "../lib/params.ts";

/**
 * `PATCH /api/v2/monitors/{monitor_id}` (Better Stack Uptime API v2).
 */
type Input = {
  monitor_id: string;
  monitor_type?: string;
  url?: string;
  pronounceable_name?: string;
  check_frequency?: number;
  request_timeout?: number;
  http_method?: string;
  follow_redirects?: boolean;
  verify_ssl?: boolean;
  required_keyword?: string;
  expected_status_codes?: unknown;
  request_headers?: unknown;
  request_body?: string;
  port?: string;
  ip_version?: string;
  regions?: string[];
  email?: boolean;
  sms?: boolean;
  call?: boolean;
  push?: boolean;
  critical_alert?: boolean;
  team_wait?: number;
  policy_id?: string;
  expiration_policy_id?: number;
  domain_expiration?: number;
  ssl_expiration?: number;
  recovery_period?: number;
  confirmation_period?: number;
  monitor_group_id?: string;
  paused?: boolean;
  maintenance_days?: string[];
  maintenance_from?: string;
  maintenance_to?: string;
  maintenance_timezone?: string;
};

const monitorUpdate: ActionDefinition<Input> = {
  key: "monitor-update",
  type: "perform",
  resource: "monitor",
  title: "Update Monitor",
  description: "Change a monitor's settings, or pause/resume it. Only the fields you set are sent.",
  idempotent: true,
  params: [
    str("monitor_id", "Monitor ID", { required: true, hint: "The monitor to change." }),
    select("monitor_type", "Monitor type", monitorTypeOptions),
    ...monitorFields(),
  ],
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "status", type: "string", label: "Status after the change" },
    { key: "paused_at", type: "string", label: "When it was paused, if it is" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "PATCH", `${V2}/monitors/${encodeId(input.monitor_id)}`, {
      body: monitorBody(input),
    }, scrubMonitor);
  },
};

export default monitorUpdate;

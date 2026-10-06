import type { ActionDefinition } from "@w6w/types";
import { oneResource, pick, scrubMonitor, V2 } from "../lib/client.ts";
import { monitorBody, monitorFields, monitorTypeOptions, select, str } from "../lib/params.ts";

/**
 * `POST /api/v2/monitors` (Better Stack Uptime API v2).
 */
type Input = {
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
  team_name?: string;
  monitor_type: string;
};

const monitorCreate: ActionDefinition<Input> = {
  key: "monitor-create",
  type: "perform",
  resource: "monitor",
  title: "Create Monitor",
  description:
    "Create a monitor. Only the type is required by this app; the vendor rejects combinations that need more (a port for tcp, a keyword for keyword monitors).",
  idempotent: false,
  params: [
    str("team_name", "Team name", {
      hint: "Required with a global API token: the team that will own the monitor.",
    }),
    select("monitor_type", "Monitor type", monitorTypeOptions, { required: true }),
    ...monitorFields(),
  ],
  output: [
    { key: "id", type: "string", label: "New monitor ID" },
    { key: "status", type: "string", label: "Initial status (pending until the first check)" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "POST", `${V2}/monitors`, {
      body: { ...pick(input, ["team_name"]), ...monitorBody(input) },
    }, scrubMonitor);
  },
};

export default monitorCreate;

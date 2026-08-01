import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  monitorId: string | number;
  friendlyName?: string;
  url?: string;
  status?: number;
  interval?: number;
  timeout?: number;
  httpUsername?: string;
  httpPassword?: string;
  httpAuthType?: number;
  port?: number;
  alertContacts?: string;
  ignoreSslErrors?: boolean;
}

/**
 * POST /editMonitor — update fields on an existing monitor. Every field
 * besides `id` is optional; only the ones supplied are sent, so a caller can
 * update a single field (e.g. just `status` to pause/resume) without
 * clobbering the rest.
 */
const monitorUpdate: ActionDefinition<Input> = {
  key: "monitor-update",
  type: "perform",
  resource: "monitor",
  title: "Update Monitor",
  description: "Update fields on an existing monitor, or pause/resume it via Status.",
  idempotent: true,
  params: [
    { key: "monitorId", label: "Monitor ID", type: "string", required: true },
    { key: "friendlyName", label: "Friendly Name", type: "string" },
    { key: "url", label: "URL / IP", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Pause or resume the monitor.",
      options: [{ value: 0, label: "Pause" }, { value: 1, label: "Resume" }],
    },
    { key: "interval", label: "Check Interval (seconds)", type: "number", advanced: true },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      advanced: true,
      validation: { min: 1, max: 60 },
    },
    { key: "httpUsername", label: "HTTP Username", type: "string", advanced: true },
    { key: "httpPassword", label: "HTTP Password", type: "secret", advanced: true },
    {
      key: "httpAuthType",
      label: "HTTP Auth Type",
      type: "select",
      advanced: true,
      options: [{ value: 1, label: "HTTP Basic" }, { value: 2, label: "Digest" }],
    },
    { key: "port", label: "Port", type: "number", advanced: true },
    {
      key: "alertContacts",
      label: "Alert Contacts",
      type: "string",
      hint: 'Dash-separated "id_threshold_recurrence" triplets, e.g. "457_0_0-373_5_0".',
      advanced: true,
    },
    { key: "ignoreSslErrors", label: "Ignore SSL Errors", type: "boolean", advanced: true },
  ],
  output: [{ key: "id", type: "number", label: "Monitor ID" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; monitor: { id: number } } & Record<string, unknown>
    >("/editMonitor", {
      id: input.monitorId,
      friendly_name: input.friendlyName,
      url: input.url,
      status: input.status,
      interval: input.interval,
      timeout: input.timeout,
      http_username: input.httpUsername,
      http_password: input.httpPassword,
      http_auth_type: input.httpAuthType,
      port: input.port,
      alert_contacts: input.alertContacts,
      ignore_ssl_errors: input.ignoreSslErrors === undefined
        ? undefined
        : (input.ignoreSslErrors ? 1 : 0),
    });
    return { id: res.monitor.id };
  },
};

export default monitorUpdate;

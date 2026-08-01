import type { ActionDefinition } from "@w6w/types";
import { UptimeRobotClient } from "../lib/client.ts";

interface Input {
  friendlyName: string;
  url: string;
  type: number;
  subType?: number;
  port?: number;
  keywordType?: number;
  keywordValue?: string;
  interval?: number;
  timeout?: number;
  httpUsername?: string;
  httpPassword?: string;
  httpAuthType?: number;
  alertContacts?: string;
  ignoreSslErrors?: boolean;
}

/**
 * POST /newMonitor — create a monitor of any type.
 *
 * `subType`/`port` are required by UptimeRobot for port monitors, and
 * `keywordType`/`keywordValue` for keyword monitors — the vendor's own docs
 * list them as conditionally required rather than always-required, so they
 * stay optional params here rather than forcing every caller through them.
 */
const monitorCreate: ActionDefinition<Input> = {
  key: "monitor-create",
  type: "perform",
  resource: "monitor",
  title: "Create Monitor",
  description: "Create a new monitor.",
  idempotent: false,
  params: [
    { key: "friendlyName", label: "Friendly Name", type: "string", required: true },
    { key: "url", label: "URL / IP", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: 1, label: "HTTP(S)" },
        { value: 2, label: "Keyword" },
        { value: 3, label: "Ping" },
        { value: 4, label: "Port" },
        { value: 5, label: "Heartbeat" },
      ],
    },
    {
      key: "subType",
      label: "Sub Type",
      type: "select",
      hint: "Required for Port monitors.",
      advanced: true,
      options: [
        { value: 1, label: "HTTP (80)" },
        { value: 2, label: "HTTPS (443)" },
        { value: 3, label: "FTP (21)" },
        { value: 4, label: "SMTP (25)" },
        { value: 5, label: "POP3 (110)" },
        { value: 6, label: "IMAP (143)" },
        { value: 99, label: "Custom Port" },
      ],
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      hint: "Required for Port monitors (with Sub Type = Custom Port).",
      advanced: true,
    },
    {
      key: "keywordType",
      label: "Keyword Type",
      type: "select",
      hint: "Required for Keyword monitors.",
      advanced: true,
      options: [{ value: 1, label: "Exists" }, { value: 2, label: "Not exists" }],
    },
    {
      key: "keywordValue",
      label: "Keyword Value",
      type: "string",
      hint: "Required for Keyword monitors.",
      advanced: true,
    },
    {
      key: "interval",
      label: "Check Interval (seconds)",
      type: "number",
      advanced: true,
    },
    {
      key: "timeout",
      label: "Timeout (seconds)",
      type: "number",
      hint: "1-60. HTTP, keyword, and port monitors only.",
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
    {
      key: "alertContacts",
      label: "Alert Contacts",
      type: "string",
      hint: 'Dash-separated "id_threshold_recurrence" triplets, e.g. "457_0_0-373_5_0".',
      advanced: true,
    },
    {
      key: "ignoreSslErrors",
      label: "Ignore SSL Errors",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "number", label: "Monitor ID" }],

  async execute(input, ctx) {
    const client = new UptimeRobotClient(ctx);
    const res = await client.request<
      { stat: "ok"; monitor: { id: number } } & Record<string, unknown>
    >("/newMonitor", {
      friendly_name: input.friendlyName,
      url: input.url,
      type: input.type,
      sub_type: input.subType,
      port: input.port,
      keyword_type: input.keywordType,
      keyword_value: input.keywordValue,
      interval: input.interval,
      timeout: input.timeout,
      http_username: input.httpUsername,
      http_password: input.httpPassword,
      http_auth_type: input.httpAuthType,
      alert_contacts: input.alertContacts,
      ignore_ssl_errors: input.ignoreSslErrors === undefined
        ? undefined
        : (input.ignoreSslErrors ? 1 : 0),
    });
    return { id: res.monitor.id };
  },
};

export default monitorCreate;

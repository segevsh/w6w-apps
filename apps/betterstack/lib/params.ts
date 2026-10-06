import type { Param } from "@w6w/types";
import { parseJsonField, pick } from "./client.ts";

type Opts = { required?: boolean; hint?: string; default?: string | number | boolean };

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", validation: { integer: true }, ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const json = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "json", ...o }) as Param;
export const select = (
  key: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  o: Opts = {},
): Param => ({ key, label, type: "select", options, ...o }) as Param;
export const multi = (
  key: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  o: Opts = {},
): Param => ({ key, label, type: "multiselect", options, ...o }) as Param;

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export const monitorTypeOptions = [
  { value: "status", label: "status: 2XX HTTP status" },
  { value: "expected_status_code", label: "expected_status_code: one of expected_status_codes" },
  { value: "keyword", label: "keyword: page contains required_keyword" },
  { value: "keyword_absence", label: "keyword_absence: page lacks required_keyword" },
  { value: "ping", label: "ping: ICMP ping of url" },
  { value: "tcp", label: "tcp: TCP port open (port required)" },
  { value: "udp", label: "udp: UDP port (port and required_keyword required)" },
  { value: "smtp", label: "smtp: SMTP server (port required)" },
  { value: "pop", label: "pop: POP3 server (port required)" },
  { value: "imap", label: "imap: IMAP server (port required)" },
  { value: "dns", label: "dns: DNS server (request_body = domain to query)" },
];
const regionOptions = opts(["us", "eu", "as", "au"]);
const dayOptions = opts(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const httpMethodOptions = opts(["GET", "HEAD", "POST", "PUT", "PATCH"]);
const triState = [{ value: "true", label: "Yes" }, { value: "false", label: "No" }];

// --- shared list params -----------------------------------------------------

export const teamNameFilter: Param = str("team_name", "Team name", {
  hint: "Only needed with a global API token: restrict the list to one team.",
});
export const pageParam: Param = int("page", "Page", {
  hint: "1-based page number. The result's nextPage says which to ask for next.",
});
export const perPageParam: Param = int("per_page", "Per page", {
  hint: "Resources per page (vendor default 50, maximum 250).",
});
export const paging = [pageParam, perPageParam];
export const pagingQuery = (i: { page?: number; per_page?: number }) => ({
  page: i.page,
  per_page: i.per_page,
});

// --- monitors ---------------------------------------------------------------

export const MONITOR_KEYS = [
  "monitor_type",
  "url",
  "pronounceable_name",
  "check_frequency",
  "request_timeout",
  "http_method",
  "follow_redirects",
  "verify_ssl",
  "required_keyword",
  "expected_status_codes",
  "request_headers",
  "request_body",
  "port",
  "ip_version",
  "regions",
  "email",
  "sms",
  "call",
  "push",
  "critical_alert",
  "team_wait",
  "policy_id",
  "expiration_policy_id",
  "domain_expiration",
  "ssl_expiration",
  "recovery_period",
  "confirmation_period",
  "monitor_group_id",
  "paused",
  "maintenance_days",
  "maintenance_from",
  "maintenance_to",
  "maintenance_timezone",
] as const;
const MONITOR_JSON = ["expected_status_codes", "request_headers"];

export const monitorFields = (): Param[] => [
  str("url", "URL or host", {
    hint: "The URL (or host, for ping/tcp/udp/smtp/pop/imap/dns monitors) to check.",
  }),
  str("pronounceable_name", "Name", { hint: "The monitor's display name." }),
  int("check_frequency", "Check frequency (seconds)", {
    hint: "Minimum 30. Must be at least the request timeout.",
  }),
  int("request_timeout", "Request timeout", {
    hint: "Milliseconds for ping/tcp/udp/smtp/pop/imap/dns (500, 1000, 2000, 3000, 5000); " +
      "seconds for the rest (2, 3, 5, 10, 15, 30, 45, 60). At most the check frequency.",
  }),
  select("http_method", "HTTP method", httpMethodOptions),
  bool("follow_redirects", "Follow redirects"),
  bool("verify_ssl", "Verify SSL certificate"),
  str("required_keyword", "Required keyword", {
    hint: "Required for keyword, keyword_absence and udp monitors.",
  }),
  json("expected_status_codes", "Expected status codes", {
    hint: "JSON array of integers, used when the type is expected_status_code. Example: [200, 301]",
  }),
  json("request_headers", "Request headers", {
    hint: 'JSON array of {"name": "...", "value": "..."} objects sent with each check.',
  }),
  text("request_body", "Request body", {
    hint: "Body for POST/PUT/PATCH checks; for a dns monitor, the domain to query.",
  }),
  str("port", "Port", { hint: "Required for tcp, udp, smtp, pop and imap monitors." }),
  select("ip_version", "IP version", [
    { value: "ipv4", label: "IPv4 only" },
    { value: "ipv6", label: "IPv6 only" },
  ], { hint: "Leave empty to use both." }),
  multi("regions", "Regions", regionOptions),
  bool("email", "Alert by e-mail"),
  bool("sms", "Alert by SMS"),
  bool("call", "Alert by phone call"),
  bool("push", "Alert by push notification"),
  bool("critical_alert", "Critical push alert", {
    hint: "Ignores the mute switch and Do Not Disturb.",
  }),
  int("team_wait", "Team wait (seconds)", {
    hint: "How long to wait before escalating to the whole team. Empty disables it.",
  }),
  str("policy_id", "Escalation policy ID"),
  int("expiration_policy_id", "Expiration escalation policy ID", {
    hint: "Policy used for SSL and domain expiry alerts.",
  }),
  int("domain_expiration", "Domain expiry alert (days)", {
    hint: "One of 1, 2, 3, 7, 14, 30, 60.",
  }),
  int("ssl_expiration", "SSL expiry alert (days)", { hint: "One of 1, 2, 3, 7, 14, 30, 60." }),
  int("recovery_period", "Recovery period (seconds)", {
    hint: "How long the monitor must be up before the incident auto-resolves.",
  }),
  int("confirmation_period", "Confirmation period (seconds)", {
    hint: "How long to wait after a failure before opening an incident (max 86400).",
  }),
  str("monitor_group_id", "Monitor group ID"),
  bool("paused", "Paused", { hint: "true pauses monitoring, false resumes it." }),
  multi("maintenance_days", "Maintenance days", dayOptions),
  str("maintenance_from", "Maintenance from", { hint: "Daily window start, e.g. 01:00." }),
  str("maintenance_to", "Maintenance to", { hint: "Daily window end, e.g. 03:00." }),
  str("maintenance_timezone", "Maintenance timezone", {
    hint: "Rails TimeZone name. Default UTC.",
  }),
];

export function monitorBody(input: Record<string, unknown>): Record<string, unknown> {
  const body = pick(input, MONITOR_KEYS);
  for (const k of MONITOR_JSON) if (k in body) body[k] = parseJsonField(k, body[k]);
  return body;
}

// --- heartbeats -------------------------------------------------------------

export const HEARTBEAT_KEYS = [
  "name",
  "period",
  "grace",
  "call",
  "sms",
  "email",
  "push",
  "critical_alert",
  "team_wait",
  "heartbeat_group_id",
  "sort_index",
  "paused",
  "server_timezone",
  "policy_id",
  "maintenance_days",
  "maintenance_from",
  "maintenance_to",
  "maintenance_timezone",
] as const;

export const heartbeatFields = (): Param[] => [
  int("period", "Period (seconds)", { hint: "How often a beat is expected. Minimum 30." }),
  int("grace", "Grace (seconds)", {
    hint: "How late a beat may be. Minimum 0; about 20% of the period is recommended.",
  }),
  bool("call", "Alert by phone call"),
  bool("sms", "Alert by SMS"),
  bool("email", "Alert by e-mail"),
  bool("push", "Alert by push notification"),
  bool("critical_alert", "Critical push alert"),
  int("team_wait", "Team wait (seconds)"),
  str("heartbeat_group_id", "Heartbeat group ID"),
  int("sort_index", "Sort index", { hint: "Position within the heartbeat group." }),
  bool("paused", "Paused", { hint: "true pauses monitoring, false resumes it." }),
  str("server_timezone", "Server timezone", {
    hint: "IANA zone (e.g. Europe/Berlin) for DST-aware detection. Needs a period of 3600+.",
  }),
  str("policy_id", "Escalation policy ID"),
  multi("maintenance_days", "Maintenance days", dayOptions),
  str("maintenance_from", "Maintenance from", { hint: "Daily window start, e.g. 01:00." }),
  str("maintenance_to", "Maintenance to", { hint: "Daily window end, e.g. 03:00." }),
  str("maintenance_timezone", "Maintenance timezone"),
];

export function heartbeatBody(input: Record<string, unknown>): Record<string, unknown> {
  return pick(input, HEARTBEAT_KEYS);
}

export const triStateOptions = triState;

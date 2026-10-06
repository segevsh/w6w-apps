import type { ActionDefinition } from "@w6w/types";
import { oneResource, parseJsonField, pick, V3 } from "../lib/client.ts";
import { bool, int, json, str, text } from "../lib/params.ts";

/**
 * `POST /api/v3/incidents` (Better Stack Uptime API v3).
 */
type Input = {
  team_name?: string;
  requester_email: string;
  summary: string;
  name?: string;
  description?: string;
  call?: boolean;
  sms?: boolean;
  email?: boolean;
  push?: boolean;
  critical_alert?: boolean;
  team_wait?: number;
  policy_id?: string;
  metadata?: unknown;
};

const incidentCreate: ActionDefinition<Input> = {
  key: "incident-create",
  type: "perform",
  resource: "incident",
  title: "Create Incident",
  description: "Open an incident by hand and alert the on-call person (or an escalation policy).",
  idempotent: false,
  params: [
    str("team_name", "Team name", {
      hint: "Required with a global API token: the team that will own the incident.",
    }),
    str("requester_email", "Requester e-mail", {
      required: true,
      hint: "E-mail of the user who requested the incident.",
    }),
    str("summary", "Summary", { required: true, hint: "Brief summary of the incident." }),
    str("name", "Name", { hint: "Short name of the incident." }),
    text("description", "Description"),
    bool("call", "Call the on-call person"),
    bool("sms", "SMS the on-call person"),
    bool("email", "E-mail the on-call person"),
    bool("push", "Push-notify the on-call person", { hint: "Vendor default is false." }),
    bool("critical_alert", "Critical push alert", { hint: "Ignores mute and Do Not Disturb." }),
    int("team_wait", "Team wait (seconds)", {
      hint: "Wait before escalating to the whole team. Empty disables it.",
    }),
    str("policy_id", "Escalation policy ID"),
    json("metadata", "Metadata", {
      hint: 'JSON object: key -> value or array of values. Example: {"Service": "billing"}',
    }),
  ],
  output: [
    { key: "id", type: "string", label: "New incident ID" },
    { key: "status", type: "string", label: "Incident status" },
    { key: "started_at", type: "string", label: "Start time" },
  ],

  execute(input, ctx) {
    const body = pick(input, [
      "team_name",
      "requester_email",
      "name",
      "summary",
      "description",
      "call",
      "sms",
      "email",
      "push",
      "critical_alert",
      "team_wait",
      "policy_id",
      "metadata",
    ]);
    if ("metadata" in body) body.metadata = parseJsonField("metadata", body.metadata);
    return oneResource(ctx, "POST", `${V3}/incidents`, { body });
  },
};

export default incidentCreate;

import type { ActionDefinition } from "@w6w/types";
import { MEETING_TYPES, unset, ZoomClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  topic: string;
  type?: number;
  startTime?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  password?: string;
  settings?: unknown;
}

const meetingCreate: ActionDefinition<Input> = {
  key: "meeting-create",
  type: "perform",
  resource: "meeting",
  title: "Create Meeting",
  description: "Schedule a meeting for a user. Returns the join and start URLs.",
  // Zoom mints a new meeting id per call and takes no request key.
  idempotent: false,
  params: [
    {
      key: "userId",
      label: "User",
      type: "string",
      default: "me",
      hint: "`me`, a user id, or the user's email address.",
    },
    { key: "topic", label: "Topic", type: "string", required: true },
    { key: "type", label: "Type", type: "select", default: 2, options: MEETING_TYPES },
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      showIf: { field: "type", in: [2, 8] },
      hint: "ISO 8601. Interpreted in the Timezone below, or as UTC when it ends in `Z`.",
    },
    {
      key: "duration",
      label: "Duration (minutes)",
      type: "number",
      row: "when",
      validation: { min: 1, integer: true },
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      row: "when",
      placeholder: "Europe/London",
      hint: "IANA name. Defaults to the user's Zoom profile timezone.",
    },
    { key: "agenda", label: "Agenda", type: "text", config: { multiline: true } },
    {
      key: "password",
      label: "Passcode",
      type: "string",
      advanced: true,
      hint: "Up to 10 characters. Zoom generates one if the account requires it and none is given.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      advanced: true,
      hint: 'Zoom meeting settings, e.g. { "join_before_host": true, "waiting_room": false }.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Meeting ID" },
    { key: "join_url", type: "string", label: "Join URL" },
    { key: "start_url", type: "string", label: "Start URL (host only — treat as a secret)" },
    { key: "password", type: "string", label: "Passcode" },
  ],

  execute(input, ctx) {
    const user = input.userId || "me";
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(user)}/meetings`, {
      method: "POST",
      body: {
        topic: input.topic,
        type: input.type ?? 2,
        start_time: unset(input.startTime),
        duration: input.duration,
        timezone: unset(input.timezone),
        agenda: unset(input.agenda),
        password: unset(input.password),
        settings: input.settings,
      },
    });
  },
};

export default meetingCreate;

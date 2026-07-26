import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  topic?: string;
  startTime?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  settings?: unknown;
}

/**
 * Zoom answers a successful meeting PATCH with 204 and no body, so there is
 * nothing to return — re-read the meeting with `meeting-get` if you need the
 * updated object.
 */
const meetingUpdate: ActionDefinition<Input> = {
  key: "meeting-update",
  type: "perform",
  resource: "meeting",
  title: "Update Meeting",
  description:
    "Update a meeting. Zoom answers 204 with no body — use `meeting-get` to read the result back.",
  // A PATCH writes absolute values, so replaying converges.
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    { key: "topic", label: "Topic", type: "string" },
    { key: "startTime", label: "Start time", type: "datetime" },
    { key: "duration", label: "Duration (minutes)", type: "number", row: "when" },
    { key: "timezone", label: "Timezone", type: "string", row: "when" },
    { key: "agenda", label: "Agenda", type: "text", config: { multiline: true } },
    { key: "settings", label: "Settings", type: "json", advanced: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(`/meetings/${encodeURIComponent(input.meetingId)}`, {
      method: "PATCH",
      body: {
        topic: unset(input.topic),
        start_time: unset(input.startTime),
        duration: input.duration,
        timezone: unset(input.timezone),
        agenda: unset(input.agenda),
        settings: input.settings,
      },
    });
  },
};

export default meetingUpdate;

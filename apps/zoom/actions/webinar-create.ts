import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  topic: string;
  type?: number;
  startTime?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  settings?: unknown;
}

/**
 * Webinars need a Webinar add-on on the Zoom plan; without it Zoom answers 400
 * regardless of the request.
 */
const webinarCreate: ActionDefinition<Input> = {
  key: "webinar-create",
  type: "perform",
  resource: "webinar",
  title: "Create Webinar",
  description: "Schedule a webinar. Requires the Webinar add-on on the Zoom plan.",
  idempotent: false,
  params: [
    { key: "userId", label: "User", type: "string", default: "me" },
    { key: "topic", label: "Topic", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: 5,
      options: [
        { value: 5, label: "Scheduled" },
        { value: 6, label: "Recurring, no fixed time" },
        { value: 9, label: "Recurring, fixed time" },
      ],
    },
    { key: "startTime", label: "Start time", type: "datetime" },
    { key: "duration", label: "Duration (minutes)", type: "number", row: "when" },
    { key: "timezone", label: "Timezone", type: "string", row: "when" },
    { key: "agenda", label: "Agenda", type: "text", config: { multiline: true } },
    { key: "settings", label: "Settings", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Webinar ID" },
    { key: "join_url", type: "string", label: "Join URL" },
    { key: "registration_url", type: "string", label: "Registration URL" },
  ],

  execute(input, ctx) {
    const user = input.userId || "me";
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(user)}/webinars`, {
      method: "POST",
      body: {
        topic: input.topic,
        type: input.type ?? 5,
        start_time: unset(input.startTime),
        duration: input.duration,
        timezone: unset(input.timezone),
        agenda: unset(input.agenda),
        settings: input.settings,
      },
    });
  },
};

export default webinarCreate;

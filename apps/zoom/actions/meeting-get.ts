import type { ActionDefinition } from "@w6w/types";
import { ZoomClient } from "../lib/client.ts";

const meetingGet: ActionDefinition<{ meetingId: string }> = {
  key: "meeting-get",
  type: "read",
  resource: "meeting",
  title: "Get Meeting",
  description: "Fetch a meeting by id.",
  params: [
    {
      key: "meetingId",
      label: "Meeting ID",
      type: "string",
      required: true,
      hint:
        "The numeric meeting id, as a string — Zoom ids exceed JavaScript's safe integer range.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Meeting ID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "duration", type: "number", label: "Duration" },
    { key: "join_url", type: "string", label: "Join URL" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(`/meetings/${encodeURIComponent(input.meetingId)}`);
  },
};

export default meetingGet;

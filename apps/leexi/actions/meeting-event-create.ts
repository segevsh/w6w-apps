import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, strList } from "../lib/client.ts";

interface Input {
  meeting_url: string;
  user_uuid: string;
  start_time: string;
  end_time: string;
  organizer: string;
  to_record?: boolean;
  internal?: boolean;
  owned?: boolean;
  title?: string;
  description?: string;
  direction?: "inbound" | "outbound";
  attendees?: string[] | string;
}

/** `POST /meeting_events` */
const meetingEventCreate: ActionDefinition<Input> = {
  key: "meeting-event-create",
  type: "perform",
  resource: "meeting-event",
  title: "Create Meeting Event",
  description:
    "Register a meeting (by its video-call URL) so Leexi can send an assistant to record it.",
  idempotent: false,
  params: [
    {
      key: "meeting_url",
      label: "Meeting URL",
      type: "string",
      required: true,
      hint: "Zoom, Teams or Google Meet link.",
    },
    {
      key: "user_uuid",
      label: "User UUID",
      type: "string",
      required: true,
      hint: "The Leexi user the meeting belongs to (see List Users).",
    },
    {
      key: "start_time",
      label: "Start time",
      type: "string",
      required: true,
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
    {
      key: "end_time",
      label: "End time",
      type: "string",
      required: true,
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
    {
      key: "organizer",
      label: "Organizer",
      type: "string",
      required: true,
      hint: "Organizer email address.",
    },
    {
      key: "to_record",
      label: "Record it",
      type: "boolean",
      hint: "Whether the Leexi assistant should record. Sent as false when unset.",
    },
    {
      key: "internal",
      label: "Internal",
      type: "boolean",
      hint: "Sent as false when unset.",
    },
    {
      key: "owned",
      label: "Owned",
      type: "boolean",
      hint: "Sent as false when unset.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ value: "inbound", label: "inbound" }, { value: "outbound", label: "outbound" }],
    },
    {
      key: "attendees",
      label: "Attendees",
      type: "array",
      item: { type: "string" },
      hint: "Attendee email addresses.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("POST", "/meeting_events", {
      body: compact({
        meeting_url: input.meeting_url,
        user_uuid: input.user_uuid,
        start_time: input.start_time,
        end_time: input.end_time,
        organizer: input.organizer,
        to_record: input.to_record ?? false,
        internal: input.internal ?? false,
        owned: input.owned ?? false,
        title: input.title,
        description: input.description,
        direction: input.direction,
        attendees: strList(input.attendees),
      }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default meetingEventCreate;

import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `GET /meeting_events/{uuid}` */
const meetingEventGet: ActionDefinition<Input> = {
  key: "meeting-event-get",
  type: "read",
  resource: "meeting-event",
  title: "Get Meeting Event",
  description: "Retrieve a single meeting event.",
  params: [
    {
      key: "uuid",
      label: "Meeting event UUID",
      type: "string",
      required: true,
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
    const res = await new LeexiClient(ctx).request("GET", `/meeting_events/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default meetingEventGet;

import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `DELETE /meeting_events/{uuid}` */
const meetingEventDelete: ActionDefinition<Input> = {
  key: "meeting-event-delete",
  type: "perform",
  resource: "meeting-event",
  title: "Delete Meeting Event",
  description: "Delete a meeting event.",
  idempotent: true,
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
    const res = await new LeexiClient(ctx).request("DELETE", `/meeting_events/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default meetingEventDelete;

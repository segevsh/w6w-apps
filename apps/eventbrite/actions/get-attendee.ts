import type { ActionDefinition } from "@w6w/types";
import { ATTENDEE_DETAIL_OUTPUT, ATTENDEE_DETAIL_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  attendeeId: string;
}

const getAttendee: ActionDefinition<Input> = {
  key: "get-attendee",
  type: "read",
  idempotent: true,
  resource: "attendee",
  title: "Get Attendee",
  description: "Retrieve a single attendee by ID.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "attendeeId", label: "Attendee ID", type: "string", required: true },
  ],
  output: ATTENDEE_DETAIL_OUTPUT,
  sample: ATTENDEE_DETAIL_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/attendees/${
        encodeURIComponent(input.attendeeId)
      }/`,
    );
  },
};

export default getAttendee;

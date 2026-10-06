import type { ActionDefinition } from "@w6w/types";
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
  output: [
    { key: "id", type: "string", label: "Attendee ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "changed", type: "string", label: "Changed" },
    { key: "profile", type: "object", label: "Profile" },
    { key: "ticket_class_id", type: "string", label: "Ticket class ID" },
    { key: "ticket_class_name", type: "string", label: "Ticket class" },
    { key: "status", type: "string", label: "Status" },
    { key: "checked_in", type: "boolean", label: "Checked in" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
    { key: "refunded", type: "boolean", label: "Refunded" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "order_id", type: "string", label: "Order ID" },
    { key: "event_id", type: "string", label: "Event ID" },
  ],

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

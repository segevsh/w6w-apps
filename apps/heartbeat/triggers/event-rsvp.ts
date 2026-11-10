import type { Param } from "@w6w/types";
import { webhookTrigger } from "../lib/triggers.ts";

const EVENT: Param = {
  key: "eventId",
  label: "Event ID",
  type: "string",
  hint: "Only RSVPs to this event. Leave empty for every event.",
};

const USER_TYPE: Param = {
  key: "userType",
  label: "Who RSVPs",
  type: "select",
  options: [
    { value: "HEARTBEAT_USER", label: "Community members only" },
    { value: "GUEST", label: "External guests only" },
  ],
  hint: "Leave empty for both members and external guests.",
};

/** Someone RSVPs to an event (action `EVENT_RSVP`, optional filters `eventID`, `userType`). */
const eventRsvp = webhookTrigger({
  key: "event-rsvp",
  title: "New Event RSVP",
  description:
    "Fires when someone RSVPs to an event (action EVENT_RSVP), optionally for one event or only for members or only for external guests. The run gets the event id, the RSVP email and the user id (null for an external guest).",
  action: "EVENT_RSVP",
  params: [EVENT, USER_TYPE],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    if (typeof p.userType === "string" && p.userType !== "") f.userType = p.userType;
    if (typeof p.eventId === "string" && p.eventId.trim() !== "") f.eventID = p.eventId.trim();
    return f;
  },
  output: [
    { key: "eventID", type: "string", label: "Event ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "userID", type: "string", label: "User ID (null for an external guest)" },
  ],
  sample: {
    action: "EVENT_RSVP",
    eventID: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    email: "ada@example.com",
    userID: null,
  },
});

export default eventRsvp;

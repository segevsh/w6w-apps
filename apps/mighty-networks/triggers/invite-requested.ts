import { webhookTrigger } from "../lib/triggers.ts";

/** Invite Requested (the `InviteRequested` webhook event). */
const inviteRequested = webhookTrigger({
  key: "invite-requested",
  title: "Invite Requested",
  description:
    "Fires when a member requests an invitation to a space. The run gets the event id and time and the payload: the request (id, status), the space and plan ids and the requesting member (id, email, name).",
  eventTypes: ["InviteRequested"],
  sample: {
    eventId: "sample-event-id",
    eventType: "InviteRequested",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 7001,
      status: "pending",
      network_id: 222,
      space_id: 111,
      plan_id: null,
      member_id: 67890,
      member_email: "ada@example.com",
      member_first_name: "Ada",
      member_last_name: "Lovelace",
      created_at: "2026-11-10T10:30:00Z",
    },
  },
});

export default inviteRequested;

import { webhookTrigger } from "../lib/triggers.ts";

/** Member Updated (the `MemberUpdated` webhook event). */
const memberUpdated = webhookTrigger({
  key: "member-updated",
  title: "Member Updated",
  description:
    "Fires when a member updates their profile. The run gets the event id and time and the payload: the member (id, name, email, location, bio), the space id and the network id.",
  eventTypes: ["MemberUpdated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberUpdated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      member: {
        id: 67890,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        member_type: "member",
      },
      space_id: 111,
      network_id: 222,
    },
  },
});

export default memberUpdated;

import { webhookTrigger } from "../lib/triggers.ts";

/** A member joins a space in the Network (the `MemberJoined` webhook event). */
const memberJoined = webhookTrigger({
  key: "member-joined",
  title: "Member Joined",
  description:
    "Fires when a member joins a space in your Network. The run gets the event id and time and the payload: the member (id, name, email, plan fields), the space id and the network id.",
  eventTypes: ["MemberJoined"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberJoined",
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

export default memberJoined;

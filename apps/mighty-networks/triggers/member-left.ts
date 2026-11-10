import { webhookTrigger } from "../lib/triggers.ts";

/** Member Left (the `MemberLeft` webhook event). */
const memberLeft = webhookTrigger({
  key: "member-left",
  title: "Member Left",
  description:
    "Fires when a member leaves a space in your Network. The run gets the event id and time and the payload: the member (id, name, email), the space id, the network id and the reason.",
  eventTypes: ["MemberLeft"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberLeft",
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
      reason: "left",
    },
  },
});

export default memberLeft;

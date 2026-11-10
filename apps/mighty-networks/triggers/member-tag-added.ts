import { webhookTrigger } from "../lib/triggers.ts";

/** Member Tag Added (the `MemberTagAdded` webhook event). */
const memberTagAdded = webhookTrigger({
  key: "member-tag-added",
  title: "Member Tag Added",
  description:
    "Fires when a tag is added to a member. The run gets the event id and time and the payload: the member, the tag (id, title, color) and the network id.",
  eventTypes: ["MemberTagAdded"],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberTagAdded",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      member: {
        id: 67890,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        member_type: "member",
      },
      tag: { id: 777, title: "VIP", color: "#ff8800" },
      network_id: 222,
    },
  },
});

export default memberTagAdded;

import { anyEventTrigger } from "../lib/triggers.ts";

/** Any Intercom webhook topic, narrowed by the optional `events` list. */
export default anyEventTrigger({
  sample: {
    notificationId: "notif_9a8b7c6d-1111-4222-8333-444455556666",
    topic: "ticket.created",
    appId: "abc123",
    createdAt: 1762683500,
    itemId: "9001",
    item: { type: "ticket", id: "9001", ticket_state: "submitted" },
  },
});

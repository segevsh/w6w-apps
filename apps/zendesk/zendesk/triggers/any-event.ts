import { anyEventTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on the event types the user lists. */
export default anyEventTrigger({
  sample: {
    eventId: "2b24ef10-19d4-4740-93cf-8f98ec4776c0",
    type: "zen:event-type:user.role_changed",
    time: "2025-07-04T05:33:18Z",
    accountId: "18763612",
    resourceId: "6596848315901",
    subject: "zen:user:6596848315901",
    detail: {
      id: "6596848315901",
      email: "jane@acme.test",
      role: "agent",
      updated_at: "2025-07-04T05:33:18Z",
    },
    event: { previous: "end-user", current: "agent" },
  },
});

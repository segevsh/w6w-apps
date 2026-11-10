import { EVENT_TYPES, resourceTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `user.deleted`. */
export default resourceTrigger({
  key: "user-deleted",
  title: "User Deleted",
  description: "Fires when a user is deleted in Zendesk. The run gets the user as it was.",
  eventType: EVENT_TYPES.userDeleted,
  sample: {
    eventId: "4d2f4b3e-8f7a-4c1b-9e5d-1a7c3b6e2f10",
    type: EVENT_TYPES.userDeleted,
    time: "2025-07-04T05:33:18Z",
    accountId: "18763612",
    resourceId: "6596848315901",
    subject: "zen:user:6596848315901",
    detail: {
      id: "6596848315901",
      email: "jane@acme.test",
      role: "end-user",
      organization_id: "0",
      created_at: "2025-07-04T05:27:58Z",
      updated_at: "2025-07-04T05:33:18Z",
    },
    event: {},
  },
});

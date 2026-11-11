import { EVENT_TYPES, resourceTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `user.created`. */
export default resourceTrigger({
  key: "new-user",
  title: "New User",
  description:
    "Fires when a user is created in Zendesk. The run gets the new user and the event that announced it.",
  eventType: EVENT_TYPES.userCreated,
  sample: {
    eventId: "6b9bbadf-5725-4e92-bebe-7b71011bf5f1",
    type: EVENT_TYPES.userCreated,
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

import { EVENT_TYPES, resourceTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `user.details_changed`. */
export default resourceTrigger({
  key: "user-details-changed",
  title: "User Details Changed",
  description:
    "Fires when a user's details field changes. The run gets the user and the previous and current details in the event.",
  eventType: EVENT_TYPES.userDetailsChanged,
  sample: {
    eventId: "6c8d3f52-1e0a-4b7c-a3d9-52f1e8b04a77",
    type: EVENT_TYPES.userDetailsChanged,
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
    event: { previous: "", current: "User's printer was on fire" },
  },
});

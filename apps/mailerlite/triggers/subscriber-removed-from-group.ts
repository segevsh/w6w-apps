import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.removed_from_group` (https://developers.mailerlite.com/docs/webhooks.html, verified 2026-11-10). */
export default webhookTrigger({
  key: "subscriber-removed-from-group",
  title: "Subscriber Removed from Group",
  description:
    "Fires when a subscriber is removed from a group (optionally one group id). The run gets the subscriber and the group.",
  event: "subscriber.removed_from_group",
  groupFilter: true,
  sample: {
    event: "subscriber.removed_from_group",
    resourceId: "100000000000000000",
    resource: {
      type: "subscriber.removed_from_group",
      subscriber: {
        id: "100000000000000000",
        email: "john.doe@example.com",
        status: "active",
        updated_at: "2026-11-10T10:30:29.000000Z",
      },
      group: { id: "100000000000000001", name: "Group Example" },
      account_id: 1,
    },
  },
});

import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.automation_completed` (https://developers.mailerlite.com/docs/webhooks.html, verified 2026-11-10). */
export default webhookTrigger({
  key: "subscriber-automation-completed",
  title: "Subscriber Automation Completed",
  description:
    "Fires when a subscriber finishes an automation. The run gets the subscriber and the automation.",
  event: "subscriber.automation_completed",
  sample: {
    event: "subscriber.automation_completed",
    resourceId: "100000000000000000",
    resource: {
      type: "subscriber.automation_completed",
      subscriber: {
        id: "100000000000000000",
        email: "john.doe@example.com",
        status: "active",
        updated_at: "2026-11-10T10:30:29.000000Z",
      },
      automation: { id: "100000000000000002", name: "Automation Example" },
      account_id: 1,
    },
  },
});

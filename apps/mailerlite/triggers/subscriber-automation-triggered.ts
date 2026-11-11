import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.automation_triggered` (https://developers.mailerlite.com/docs/webhooks.html, verified 2026-11-10). */
export default webhookTrigger({
  key: "subscriber-automation-triggered",
  title: "Subscriber Automation Triggered",
  description:
    "Fires when a subscriber starts an automation. The run gets the subscriber and the automation.",
  event: "subscriber.automation_triggered",
  sample: {
    event: "subscriber.automation_triggered",
    resourceId: "100000000000000000",
    resource: {
      type: "subscriber.automation_triggered",
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

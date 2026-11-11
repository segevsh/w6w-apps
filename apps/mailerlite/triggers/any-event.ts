import { webhookTrigger } from "../lib/triggers.ts";

/**
 * Any MailerLite event. The `events` param (comma-separated, empty = all fourteen) is the list the
 * webhook is registered for; campaign.open, campaign.click and subscriber.deleted need a batchable
 * webhook, so choosing one registers it with `batchable: true` and its deliveries arrive as
 * `{ events: [...] }`, one run per item.
 * https://developers.mailerlite.com/docs/webhooks.html (verified 2026-11-10)
 */
export default webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the MailerLite events you choose (subscriber.created, subscriber.updated, subscriber.unsubscribed, subscriber.added_to_group, subscriber.removed_from_group, subscriber.bounced, subscriber.automation_triggered, subscriber.automation_completed, subscriber.spam_reported, subscriber.deleted, subscriber.active, campaign.sent, campaign.click, campaign.open; all when empty). The run gets the event name and the subscriber or campaign it is about.",
  sample: {
    event: "campaign.open",
    resourceId: "100000000000000000",
    resource: {
      type: "campaign.open",
      subscriber: {
        id: "100000000000000000",
        email: "john.doe@example.com",
        status: "active",
        updated_at: "2026-11-10T10:30:29.000000Z",
      },
      campaign: {
        id: "100000000000000003",
        name: "Campaign Example",
        total_recipients: 100,
        preview_url: "https://example.com/preview",
        date: "2026-11-10T07:11:08.000000Z",
      },
    },
  },
});

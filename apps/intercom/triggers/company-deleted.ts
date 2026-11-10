import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `company.deleted`. */
export default webhookTrigger({
  key: "company-deleted",
  title: "Company Deleted",
  description:
    "Fires when a company is deleted in Intercom. The run gets the notification id and topic and the company object as it was.",
  topic: "company.deleted",
  sample: {
    notificationId: "notif_06c0ffee-1111-4222-8333-444455556666",
    topic: "company.deleted",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "5f4d3c2b1a0987654321fedc",
    item: {
      type: "company",
      id: "5f4d3c2b1a0987654321fedc",
      company_id: "acme-1",
      name: "Acme Ltd",
      user_count: 3,
    },
  },
});

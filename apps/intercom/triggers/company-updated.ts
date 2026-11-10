import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `company.updated`. */
export default webhookTrigger({
  key: "company-updated",
  title: "Company Updated",
  description:
    "Fires when a company is updated in Intercom. The run gets the notification id and topic and the updated company object.",
  topic: "company.updated",
  sample: {
    notificationId: "notif_05c0ffee-1111-4222-8333-444455556666",
    topic: "company.updated",
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

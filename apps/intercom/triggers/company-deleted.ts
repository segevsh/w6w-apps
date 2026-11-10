import { DELETED_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `company.deleted`. */
export default webhookTrigger({
  key: "company-deleted",
  title: "Company Deleted",
  description:
    "Fires when a company is deleted in Intercom. The run gets the notification id and topic and the company's type and id (Intercom sends only identifying fields for a deletion, not the full company).",
  topic: "company.deleted",
  output: DELETED_OUTPUT,
  sample: {
    notificationId: "notif_06c0ffee-1111-4222-8333-444455556666",
    topic: "company.deleted",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "5f4d3c2b1a0987654321fedc",
    item: { type: "company", id: "5f4d3c2b1a0987654321fedc" },
  },
});

import { webhookTrigger } from "../lib/triggers.ts";

/** A Help Scout webhook on `customer.created`. */
export default webhookTrigger({
  key: "new-customer",
  title: "New Customer",
  description:
    "Fires when a customer is created in Help Scout, in any inbox. The run gets the new customer record.",
  event: "customer.created",
  mailboxFilter: false,
  sample: {
    event: "customer.created",
    resourceId: "7123",
    resource: {
      id: 7123,
      firstName: "Jackie",
      lastName: "Chan",
      _embedded: { emails: [{ id: 1, value: "jackie@example.com", type: "work" }] },
      createdAt: "2026-11-09T09:30:00Z",
    },
  },
});

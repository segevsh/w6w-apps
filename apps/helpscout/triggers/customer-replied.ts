import { webhookTrigger } from "../lib/triggers.ts";

/** A Help Scout webhook on `convo.customer.reply.created`. */
export default webhookTrigger({
  key: "customer-replied",
  title: "Customer Replied",
  description:
    "Fires when a customer replies to a conversation. The run gets the conversation the reply belongs to.",
  event: "convo.customer.reply.created",
  mailboxFilter: true,
  sample: {
    event: "convo.customer.reply.created",
    resourceId: "3443157477",
    resource: {
      id: 3443157477,
      number: 1432,
      type: "email",
      status: "active",
      subject: "Where is my order?",
      mailboxId: 85,
      primaryCustomer: {
        id: 7123,
        firstName: "Jackie",
        lastName: "Chan",
        email: "jackie@example.com",
      },
      assignee: { id: 20, firstName: "Ada", lastName: "Lovelace" },
      tags: [{ id: 11, tag: "shipping" }],
      createdAt: "2026-11-09T09:30:00Z",
    },
  },
});

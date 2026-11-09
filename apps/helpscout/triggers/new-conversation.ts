import { webhookTrigger } from "../lib/triggers.ts";

/** A Help Scout webhook on `convo.created`. */
export default webhookTrigger({
  key: "new-conversation",
  title: "New Conversation",
  description:
    "Fires when a conversation is created in Help Scout. The run gets the new conversation (subject, status, customer, assignee, tags).",
  event: "convo.created",
  mailboxFilter: true,
  sample: {
    event: "convo.created",
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

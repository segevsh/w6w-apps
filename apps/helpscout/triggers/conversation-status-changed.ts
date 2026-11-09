import { webhookTrigger } from "../lib/triggers.ts";

/** A Help Scout webhook on `convo.status`. */
export default webhookTrigger({
  key: "conversation-status-changed",
  title: "Conversation Status Changed",
  description:
    "Fires when a conversation's status changes (active, pending, closed, spam). The run gets the conversation with its new status.",
  event: "convo.status",
  mailboxFilter: true,
  sample: {
    event: "convo.status",
    resourceId: "3443157477",
    resource: {
      id: 3443157477,
      number: 1432,
      type: "email",
      status: "closed",
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

import { webhookTrigger } from "../lib/triggers.ts";

/** A user sends a message to a contact (webhook event `OutboundMessage`). */
const outboundMessage = webhookTrigger({
  key: "outbound-message",
  title: "New Outbound Message",
  description:
    "Fires when a user sends a message to a contact in a HighLevel location (webhook event OutboundMessage: SMS, email, call and other channels). The run gets the location, conversation, contact and message ids and the full payload with the body, message type and direction.",
  eventType: "OutboundMessage",
  sample: {
    type: "OutboundMessage",
    locationId: "sample-location-id",
    id: "sample-message-id",
    contactId: "sample-contact-id",
    conversationId: "sample-conversation-id",
    data: {
      type: "OutboundMessage",
      locationId: "sample-location-id",
      messageId: "sample-message-id",
      conversationId: "sample-conversation-id",
      contactId: "sample-contact-id",
      body: "This is a test message",
      contentType: "text/plain",
      direction: "outbound",
      messageType: "SMS",
      status: "sent",
      dateAdded: "2026-11-10T11:31:45.750Z",
    },
  },
});

export default outboundMessage;

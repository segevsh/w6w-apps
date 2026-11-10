import { webhookTrigger } from "../lib/triggers.ts";

/** A contact sends an inbound message (webhook event `InboundMessage`). */
const inboundMessage = webhookTrigger({
  key: "inbound-message",
  title: "New Inbound Message",
  description:
    "Fires when a contact sends an inbound message to a HighLevel location (webhook event InboundMessage: SMS, email, chat widget and others). The run gets the location, conversation, contact and message ids and the full payload with the body, message type and direction.",
  eventType: "InboundMessage",
  sample: {
    type: "InboundMessage",
    locationId: "sample-location-id",
    id: "sample-message-id",
    contactId: "sample-contact-id",
    conversationId: "sample-conversation-id",
    data: {
      type: "InboundMessage",
      locationId: "sample-location-id",
      messageId: "sample-message-id",
      conversationId: "sample-conversation-id",
      contactId: "sample-contact-id",
      body: "This is a test message",
      contentType: "text/plain",
      direction: "inbound",
      messageType: "SMS",
      status: "delivered",
      dateAdded: "2026-11-10T11:31:45.750Z",
    },
  },
});

export default inboundMessage;

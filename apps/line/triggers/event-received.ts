import { webhookTrigger } from "../lib/triggers.ts";

/** A LINE webhook event: a message, a follow, an unfollow (block) or a postback by default. */
const eventReceived = webhookTrigger({
  key: "event-received",
  title: "LINE Event",
  description:
    "Fires for each LINE webhook event of the chosen types (default: message, follow, unfollow, postback) on a channel. The run gets the event type, reply token, source user, group or room, the message or postback object, the webhook event id and redelivery flag, and the full event.",
  sample: {
    type: "message",
    webhookEventId: "01FZ74A0TDDPYRVKNK77XKC3ZR",
    timestamp: 1762683400123,
    destination: "Ubot0000000000000000000000000000",
    mode: "active",
    isRedelivery: false,
    replyToken: "sample-reply-token",
    sourceType: "user",
    userId: "Uuser000000000000000000000000000",
    groupId: null,
    roomId: null,
    message: { id: "sample-message-id", type: "text", text: "Hello" },
    postback: null,
    event: {
      type: "message",
      message: { id: "sample-message-id", type: "text", text: "Hello" },
      timestamp: 1762683400123,
      source: { type: "user", userId: "Uuser000000000000000000000000000" },
      replyToken: "sample-reply-token",
      mode: "active",
      webhookEventId: "01FZ74A0TDDPYRVKNK77XKC3ZR",
      deliveryContext: { isRedelivery: false },
    },
  },
});

export default eventReceived;

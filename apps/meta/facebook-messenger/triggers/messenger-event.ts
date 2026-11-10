import { webhookTrigger } from "../lib/triggers.ts";

/** A Messenger message, postback or delivery receipt arrives for the Page (the `messages`, `messaging_postbacks` and `message_deliveries` fields). */
const messengerEvent = webhookTrigger({
  key: "messenger-event",
  title: "Messenger Event",
  description:
    "Fires when your Facebook Page receives a Messenger message, a person taps a postback button, Get Started or a menu item, or a message you sent is delivered, optionally narrowed to some of those kinds. The run gets the kind, page, sender's page-scoped id, time, message id, text, attachments, quick-reply payload, button title and payload, delivered message ids and the full event.",
  sample: {
    kind: "message",
    pageId: "sample-page-id",
    senderId: "sample-psid",
    recipientId: "sample-page-id",
    timestamp: 1762770600000,
    messageId: "m_sample-message-id",
    text: "Hello, world!",
    attachments: [],
    quickReplyPayload: null,
    postbackTitle: null,
    postbackPayload: null,
    referral: null,
    deliveredMessageIds: [],
    watermark: null,
    data: {
      sender: { id: "sample-psid" },
      recipient: { id: "sample-page-id" },
      timestamp: 1762770600000,
      message: { mid: "m_sample-message-id", text: "Hello, world!" },
    },
  },
});

export default messengerEvent;

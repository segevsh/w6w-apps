import { telegramTrigger } from "../lib/triggers.ts";

const channelPost = telegramTrigger({
  key: "channel-post",
  title: "Channel Post",
  description:
    "Fires when a post is published in a channel the bot is in. The run gets the channel id, the text and the message id.",
  allowedUpdates: ["channel_post"],
  sample: {
    "updateId": 10002,
    "updateType": "channel_post",
    "chatId": "-1001234567890",
    "fromId": null,
    "messageId": 77,
    "text": "Release notes",
    "date": 1441645532,
    "update": {
      "update_id": 10002,
      "channel_post": {
        "message_id": 77,
        "sender_chat": {
          "id": -1001234567890,
          "type": "channel",
          "title": "News",
        },
        "chat": {
          "id": -1001234567890,
          "type": "channel",
          "title": "News",
        },
        "date": 1441645532,
        "text": "Release notes",
      },
    },
  },
});

export default channelPost;

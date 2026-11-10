import { telegramTrigger } from "../lib/triggers.ts";

const editedChannelPost = telegramTrigger({
  key: "edited-channel-post",
  title: "Edited Channel Post",
  description:
    "Fires when a channel post is edited. The run gets the channel id, the new text and the message id.",
  allowedUpdates: ["edited_channel_post"],
  sample: {
    "updateId": 10003,
    "updateType": "edited_channel_post",
    "chatId": "-1001234567890",
    "fromId": null,
    "messageId": 77,
    "text": "Release notes v2",
    "date": 1441645532,
    "update": {
      "update_id": 10003,
      "edited_channel_post": {
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
        "edit_date": 1441645700,
        "text": "Release notes v2",
      },
    },
  },
});

export default editedChannelPost;

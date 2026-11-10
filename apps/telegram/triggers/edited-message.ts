import { telegramTrigger } from "../lib/triggers.ts";

const editedMessage = telegramTrigger({
  key: "edited-message",
  title: "Edited Message",
  description:
    "Fires when someone edits a message the bot knows about. The run gets the chat, sender, new text and message id.",
  allowedUpdates: ["edited_message"],
  sample: {
    "updateId": 10001,
    "updateType": "edited_message",
    "chatId": "1111111",
    "fromId": "1111111",
    "messageId": 1365,
    "text": "Hello again",
    "date": 1441645532,
    "update": {
      "update_id": 10001,
      "edited_message": {
        "message_id": 1365,
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "chat": {
          "id": 1111111,
          "type": "private",
        },
        "date": 1441645532,
        "text": "Hello again",
        "edit_date": 1441645600,
      },
    },
  },
});

export default editedMessage;

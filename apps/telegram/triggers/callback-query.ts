import { telegramTrigger } from "../lib/triggers.ts";

const callbackQuery = telegramTrigger({
  key: "callback-query",
  title: "Button Pressed",
  description:
    "Fires when someone presses an inline keyboard button on one of the bot's messages. The run gets the button data (as text), the chat, the sender and the message id; answer it with the Answer Callback Query action.",
  allowedUpdates: ["callback_query"],
  sample: {
    "updateId": 10004,
    "updateType": "callback_query",
    "chatId": "1111111",
    "fromId": "1111111",
    "messageId": 1366,
    "text": "button-1",
    "date": 1441645532,
    "update": {
      "update_id": 10004,
      "callback_query": {
        "id": "42",
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "message": {
          "message_id": 1366,
          "chat": {
            "id": 1111111,
            "type": "private",
          },
          "date": 1441645532,
          "text": "Pick one",
        },
        "chat_instance": "-1000000000000000001",
        "data": "button-1",
      },
    },
  },
});

export default callbackQuery;

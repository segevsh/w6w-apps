import { telegramTrigger } from "../lib/triggers.ts";

const inlineQuery = telegramTrigger({
  key: "inline-query",
  title: "Inline Query",
  description:
    "Fires when someone types the bot's @username in any chat. The run gets the sender and the raw update, whose inline_query holds the query text.",
  allowedUpdates: ["inline_query"],
  sample: {
    "updateId": 10005,
    "updateType": "inline_query",
    "chatId": null,
    "fromId": "1111111",
    "messageId": null,
    "text": null,
    "date": null,
    "update": {
      "update_id": 10005,
      "inline_query": {
        "id": "7",
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "query": "cats",
        "offset": "",
      },
    },
  },
});

export default inlineQuery;

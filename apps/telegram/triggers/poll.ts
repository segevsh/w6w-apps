import { telegramTrigger } from "../lib/triggers.ts";

const poll = telegramTrigger({
  key: "poll",
  title: "Poll Changed",
  description:
    "Fires when the state of a poll the bot sent changes, or a poll it sent is stopped. The run gets the raw update, which holds the poll with its vote counts.",
  allowedUpdates: ["poll"],
  sample: {
    "updateId": 10008,
    "updateType": "poll",
    "chatId": null,
    "fromId": null,
    "messageId": null,
    "text": null,
    "date": null,
    "update": {
      "update_id": 10008,
      "poll": {
        "id": "5",
        "question": "Lunch?",
        "options": [
          {
            "text": "Pizza",
            "voter_count": 2,
          },
          {
            "text": "Sushi",
            "voter_count": 1,
          },
        ],
        "total_voter_count": 3,
        "is_closed": false,
        "is_anonymous": true,
        "type": "regular",
        "allows_multiple_answers": false,
      },
    },
  },
});

export default poll;

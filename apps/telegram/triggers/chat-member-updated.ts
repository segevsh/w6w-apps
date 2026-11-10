import { telegramTrigger } from "../lib/triggers.ts";

const chatMemberUpdated = telegramTrigger({
  key: "chat-member-updated",
  title: "Chat Member Changed",
  description:
    "Fires when a member joins, leaves or changes status in a chat the bot administers, or when the bot's own status in a chat changes. The run gets the chat, the user who made the change and the raw update with the old and new member status.",
  allowedUpdates: ["chat_member", "my_chat_member"],
  sample: {
    "updateId": 10009,
    "updateType": "chat_member",
    "chatId": "-1001234567890",
    "fromId": "1111111",
    "messageId": null,
    "text": null,
    "date": 1441645532,
    "update": {
      "update_id": 10009,
      "chat_member": {
        "chat": {
          "id": -1001234567890,
          "type": "supergroup",
          "title": "Team",
        },
        "from": {
          "id": 1111111,
          "is_bot": false,
          "first_name": "Test",
        },
        "date": 1441645532,
        "old_chat_member": {
          "status": "left",
          "user": {
            "id": 2222222,
            "is_bot": false,
            "first_name": "New",
          },
        },
        "new_chat_member": {
          "status": "member",
          "user": {
            "id": 2222222,
            "is_bot": false,
            "first_name": "New",
          },
        },
      },
    },
  },
});

export default chatMemberUpdated;

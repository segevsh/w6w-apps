import { telegramTrigger } from "../lib/triggers.ts";

/** A message sent to the bot or to a group it is in. */
const newMessage = telegramTrigger({
  key: "new-message",
  title: "New Message",
  description:
    "Fires when someone sends the bot a message. The run gets the chat, sender, text and message id.",
  allowedUpdates: ["message"],
});

export default newMessage;

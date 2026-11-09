import { telegramTrigger } from "../lib/triggers.ts";

/** Any Bot API update (button presses, edited messages, channel posts, membership changes). */
const update = telegramTrigger({
  key: "update",
  title: "Bot Update",
  description:
    "Fires on any Telegram update for the bot, such as a button press or a channel post. The run gets the update type and the raw update.",
});

export default update;

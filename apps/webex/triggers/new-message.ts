import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** A message posted to a space the connected account is in. */
const newMessage = webexTrigger({
  key: "new-message",
  title: "New Message",
  description:
    "Fires when a message is posted in a Webex space the connection can see. The run gets the space, the sender and the message text.",
  resource: "messages",
  event: "created",
  sample: MESSAGE_SAMPLE,
});

export default newMessage;

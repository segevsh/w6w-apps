import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** A message removed from a space the connected account is in (`messages` / `deleted`). */
const messageDeleted = webexTrigger({
  key: "message-deleted",
  title: "Message Deleted",
  description:
    "Fires when a message is deleted from a Webex space the connection can see. The run gets the space, the person who deleted it and the message id; the text is gone, so it is not fetched.",
  resource: "messages",
  event: "deleted",
  sample: {
    ...MESSAGE_SAMPLE,
    event: "deleted",
    text: null,
    message: null,
    data: {
      id: MESSAGE_SAMPLE.id,
      roomId: MESSAGE_SAMPLE.roomId,
      personId: MESSAGE_SAMPLE.personId,
    },
  },
});

export default messageDeleted;

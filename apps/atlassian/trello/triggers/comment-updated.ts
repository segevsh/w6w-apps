import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "comment-updated",
  title: "Comment Updated",
  description:
    "Fires when a comment on a card is edited. The run gets the card, the editor and the comment in the action data (old and new text).",
  match: (type) => type === "updateComment",
  withData: true,
  sample: {
    type: "updateComment",
  },
});

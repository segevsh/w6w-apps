import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "comment-added",
  title: "Comment Added",
  description:
    "Fires when a comment is added to a card on the watched Trello board or list. The run gets the comment text, the card and the commenter.",
  match: (type) => type === "commentCard",
});

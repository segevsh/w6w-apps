import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-comment-posted",
  title: "Task Comment Posted",
  description:
    "Fires when a comment is posted on a ClickUp task. The run gets the task ID and the comment in the history items.",
  events: ["taskCommentPosted"],
});

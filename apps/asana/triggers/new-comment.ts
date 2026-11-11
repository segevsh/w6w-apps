import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "new-comment",
  title: "New Comment",
  description:
    "Fires when a comment is added to a task (or subtask) in an Asana project. The run gets the comment's story ID, the task it belongs to and who wrote it; fetch the text with the task's stories.",
  scope: "project",
  filters: [{ resource_type: "story", resource_subtype: "comment_added", action: "added" }],
});

import { newestFirst } from "../lib/triggers.ts";
import commentList from "../actions/comment-list.ts";

export default newestFirst({
  key: "new-comment",
  title: "New Comment",
  description: "The run gets each comment newly posted on one task.",
  action: commentList as never,
  params: [{
    key: "taskId",
    label: "Task ID",
    type: "number",
    required: true,
    hint: "The task to watch (from List Tasks).",
  }],
  input: (p) => ({ taskId: Number(p.taskId) }),
  idOf: (item) => String(item.id ?? ""),
  output: [{ key: "id", type: "number", label: "Comment ID" }, {
    key: "text",
    type: "string",
    label: "Comment text",
  }, { key: "person_id", type: "number", label: "Author person ID" }],
  sample: { id: 501, text: "Looks good", person_id: 7 },
});

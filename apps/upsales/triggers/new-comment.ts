import commentList from "../actions/comment-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-comment",
  title: "New Comment",
  action: commentList,
  output: [{ key: "id", type: "number", label: "Comment ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});

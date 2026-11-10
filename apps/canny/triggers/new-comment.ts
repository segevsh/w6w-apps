import { pollFromListAction } from "../../_shared/poll/mod.ts";
import commentList from "../actions/comment-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `comment-list`. Canny documents the list as "Sorted by newest"
 * (https://developers.canny.io/api-reference, verified 2026-11-10), so page 1 is the newest page.
 */
export default pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description:
    "The run gets each newly created Canny portal comment across the workspace (the list is sorted newest first).",
  action: commentList,
  input: () => ({ limit: 100 }),
  items: itemsAt("items"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "created", type: "string", label: "Created at" },
    { key: "internal", type: "boolean", label: "Internal note" },
    { key: "value", type: "string", label: "Comment text" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d11",
    created: "2026-11-09T09:00:00.000Z",
    internal: false,
    value: "Please add this soon",
  },
  maxPages: 1,
});

import { pollFromListAction } from "../../_shared/poll/mod.ts";
import tagList from "../actions/tag-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `tag-list`. Canny documents the list as "Sorted by newest"
 * (https://developers.canny.io/api-reference, verified 2026-11-10), so page 1 is the newest page.
 */
export default pollFromListAction({
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each newly created Canny tag across the workspace (the list is sorted newest first).",
  action: tagList,
  input: () => ({ limit: 100 }),
  items: itemsAt("tags"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "string", label: "Created at" },
    { key: "postCount", type: "number", label: "Post count" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d14",
    name: "iOS",
    created: "2026-11-09T09:00:00.000Z",
    postCount: 0,
  },
  maxPages: 1,
});

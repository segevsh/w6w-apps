import { pollFromListAction } from "../../_shared/poll/mod.ts";
import categoryList from "../actions/category-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `category-list`. Canny documents the list as "Sorted by newest"
 * (https://developers.canny.io/api-reference, verified 2026-11-10), so page 1 is the newest page.
 */
export default pollFromListAction({
  key: "new-category",
  title: "New Category",
  description:
    "The run gets each newly created Canny category across the workspace (the list is sorted newest first).",
  action: categoryList,
  input: () => ({ limit: 100 }),
  items: itemsAt("categories"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Category ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "string", label: "Created at" },
    { key: "postCount", type: "number", label: "Post count" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d15",
    name: "Dashboard",
    created: "2026-11-09T09:00:00.000Z",
    postCount: 0,
  },
  maxPages: 1,
});

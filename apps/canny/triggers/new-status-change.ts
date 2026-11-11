import { pollFromListAction } from "../../_shared/poll/mod.ts";
import statusChangeList from "../actions/status-change-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `status-change-list`. Canny documents the list as "Sorted by newest"
 * (https://developers.canny.io/api-reference, verified 2026-11-10), so page 1 is the newest page.
 */
export default pollFromListAction({
  key: "new-status-change",
  title: "New Status Change",
  description:
    "The run gets each newly recorded post status change across the workspace (the feed is sorted newest first).",
  action: statusChangeList,
  input: () => ({ limit: 100 }),
  items: itemsAt("items"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Status change ID" },
    { key: "created", type: "string", label: "Created at" },
    { key: "post", type: "object", label: "Post" },
    { key: "changer", type: "object", label: "Changed by" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d13",
    created: "2026-11-09T09:00:00.000Z",
    post: { id: "5f3a1b2c3d4e5f6a7b8c9d0e", title: "Dark mode", status: "planned" },
    changer: { id: "5f3a1b2c3d4e5f6a7b8c9d07", name: "Sample User" },
  },
  maxPages: 1,
});

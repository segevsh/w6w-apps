import { pollFromListAction } from "../../_shared/poll/mod.ts";
import voteList from "../actions/vote-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `vote-list`. Canny documents the list as "Sorted by newest"
 * (https://developers.canny.io/api-reference, verified 2026-11-10), so page 1 is the newest page.
 */
export default pollFromListAction({
  key: "new-vote",
  title: "New Vote",
  description:
    "The run gets each newly cast Canny vote across the workspace (the list is sorted newest first).",
  action: voteList,
  input: () => ({ limit: 100 }),
  items: itemsAt("items"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Vote ID" },
    { key: "created", type: "string", label: "Created at" },
    { key: "post", type: "object", label: "Voted post" },
    { key: "by", type: "object", label: "Voted by" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d12",
    created: "2026-11-09T09:00:00.000Z",
    post: { id: "5f3a1b2c3d4e5f6a7b8c9d0e", title: "Dark mode" },
    by: { id: "5f3a1b2c3d4e5f6a7b8c9d07", name: "Sample User" },
  },
  maxPages: 1,
});

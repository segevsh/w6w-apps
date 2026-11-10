import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupList from "../actions/group-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the group resource (https://api.sender.net/groups/list-all/).
 */
export default pollFromListAction({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created subscriber group.",
  action: groupList,
  input: () => ({ page: 1, limit: 100, order: "created", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: { id: "group-1", title: "Newsletter", created: "2026-11-10 09:00:00" },
  maxPages: 1,
});

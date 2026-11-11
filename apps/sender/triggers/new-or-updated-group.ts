import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupList from "../actions/group-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the group resource (https://api.sender.net/groups/list-all/).
 */
export default pollFromListAction({
  key: "new-or-updated-group",
  title: "New or Updated Group",
  description: "The run gets each group when it is created or modified.",
  action: groupList,
  input: () => ({ page: 1, limit: 100, order: "modified", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { modified?: unknown }).modified ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "modified", type: "string", label: "Modified" },
  ],
  sample: { id: "group-1", title: "Newsletter", modified: "2026-11-10 09:30:00" },
  maxPages: 1,
});

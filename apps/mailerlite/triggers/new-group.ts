import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listGroups from "../actions/list-groups.ts";

/**
 * `GET /api/groups?sort=-created_at` is newest-first: `sort` takes `created_at` and "prepend `-`
 * for descending order" (https://developers.mailerlite.com/docs/groups.html, verified 2026-11-10).
 * An account has at most 1000 groups; one page of 25 holds the newest.
 */
export default pollFromListAction({
  key: "new-group",
  title: "New Group",
  description: "The run gets each group newly created in the MailerLite account.",
  action: listGroups,
  input: () => ({ sort: "-created_at", limit: 25, page: 1 }),
  items: (result) => (result as { data?: unknown[] })?.data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active_count", type: "number", label: "Active subscribers" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "100000000000000001",
    name: "Group Example",
    active_count: 0,
    created_at: "2026-11-10 09:00:00",
  },
  maxPages: 1,
});

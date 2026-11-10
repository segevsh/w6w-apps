import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/team-list.ts";

// Teams list: `order=desc` sorts by creation date, newest first
// (https://developer.aircall.io/api-references/ "List all Teams", verified 2026-11-10).
export default pollFromListAction({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created Aircall Team.",
  action,
  input: () => ({ order: "desc", page: 1, perPage: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "users", type: "array", label: "Members" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 12, name: "Support", users: [], created_at: "2026-11-01T10:00:00Z" },
  maxPages: 1,
});

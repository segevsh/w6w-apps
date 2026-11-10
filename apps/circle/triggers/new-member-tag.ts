import { pollFromListAction } from "../../_shared/poll/mod.ts";
import memberTagList from "../actions/member-tag-list.ts";
import { idOf, records } from "../lib/triggers.ts";

export default pollFromListAction({
  key: "new-member-tag",
  title: "New Member Tag",
  description: "The run gets each newly created member tag (GET /member_tags with sort=newest).",
  action: memberTagList,
  // `newest` is a documented value of the `sort` enum on GET /member_tags.
  input: () => ({ sort: "newest", page: 1, perPage: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_public", type: "boolean", label: "Public" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 7, name: "VIP", is_public: true, created_at: "2026-11-09T09:00:00.000Z" },
  maxPages: 1,
});
